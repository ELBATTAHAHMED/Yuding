# Yuding V2 — Durable AI Conversations (Phase 46)

## 1. Overview & Architectural Boundaries

Phase 46 introduces **real, durable conversation persistence and context** for the Yuding AI Assistant. Prior to Phase 46, conversations were ephemeral client-side sessions that disappeared upon page refresh or service restart.

In Phase 46:
- Conversation threads, user messages, assistant responses, and semantic tool calls are durably persisted in PostgreSQL schema `ai`.
- Bounded conversational context (last 20 messages) is passed to the LLM during multi-turn interactions.
- Prior conversational context is explicitly treated as **conversational dialogue memory only**; any follow-up question requesting live travel facts (prices, weather, availability, booking status, exchange rates) **re-executes Phase 45 tools** to ensure 100% grounded truth.
- Strong defense-in-depth and IDOR protections guarantee that one user can **never** read or write another user's conversation threads.
- Chat state survives page refreshes and `ai-service` restarts.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Next.js)                                │
│                   <AiChatWidget /> with Thread Switcher                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ POST/GET /api/ai/conversations/**
                                       │ POST /api/ai/chat (Bearer JWT)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API Gateway (:8888)                                │
│                 Routes: /api/ai/**, /ai/** -> AI-SERVICE                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI Service (:7777)                                 │
│  • AiChatController: /api/ai/conversations, /api/ai/chat                     │
│  • AiConversationService: Ownership & Lifecycle Management                 │
│  • AiChatService: Multi-turn Context + Tool Execution Coordinator           │
│  • SecurityUtils: RS256 JWT Sub/Owner Verification (Anti-IDOR)              │
└──────────────┬───────────────────────────────────────────────┬──────────────┘
               │                                               │
               ▼ (Spring Data JPA)                             ▼ (LLM Providers)
┌───────────────────────────────┐              ┌───────────────────────────────┐
│     PostgreSQL (:5433)        │              │  Gemini 3.8 / Groq Fallback   │
│  Logical Schema: ai           │              │  + Phase 45 Grounded Tools    │
│  • ai.conversations           │              └───────────────────────────────┘
│  • ai.messages                │
│  • ai.tool_calls              │
└───────────────────────────────┘
```

---

## 2. Database Schema & Flyway Authority

All DDL modifications are managed exclusively via Flyway migration `V24__ai_conversations.sql` against the `yuding` database (`ai` schema) on PostgreSQL port 5433:

### 2.1 Schema Tables

1. **`ai.conversations`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID NOT NULL` (maps to `identity.users(id)`)
   - `session_token VARCHAR(64) NULL`
   - `title VARCHAR(255)`
   - `status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE'`
   - `metadata_json JSONB NULL`
   - `last_message_at TIMESTAMPTZ NULL`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - `version INTEGER NOT NULL DEFAULT 0`
   - **Index**: `idx_ai_conversations_user ON ai.conversations (user_id, last_message_at DESC NULLS LAST)`

2. **`ai.messages`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE`
   - `role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ASSISTANT', 'SYSTEM', 'TOOL'))`
   - `content TEXT NOT NULL`
   - `grounded BOOLEAN DEFAULT FALSE`
   - `provider VARCHAR(64) NULL`
   - `model VARCHAR(64) NULL`
   - `tool_count INTEGER DEFAULT 0`
   - `sequence_number INTEGER NOT NULL DEFAULT 0`
   - `tool_calls_json JSONB NULL`
   - `tokens_used INTEGER NULL`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - **Index**: `idx_ai_messages_conv ON ai.messages (conversation_id, sequence_number ASC, created_at ASC)`

3. **`ai.tool_calls`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `conversation_id UUID NOT NULL REFERENCES ai.conversations(id) ON DELETE CASCADE`
   - `assistant_message_id UUID NULL REFERENCES ai.messages(id) ON DELETE SET NULL`
   - `tool_name VARCHAR(64) NOT NULL`
   - `tool_call_id VARCHAR(128) NULL`
   - `arguments_json JSONB NULL`
   - `status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS'`
   - `result_summary_json JSONB NULL`
   - `started_at TIMESTAMPTZ NULL`
   - `completed_at TIMESTAMPTZ NULL`
   - `duration_ms BIGINT NULL`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
   - **Index**: `idx_ai_tool_calls_conv ON ai.tool_calls (conversation_id, created_at ASC)`

---

## 3. REST API Contract & Endpoints

All endpoints require RS256 JWT Bearer token authentication and are routed via API Gateway (`http://localhost:8888`).

| Method | Path | Description | Access | Response Codes |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/conversations` | Creates a new conversation thread for the caller | `ROLE_USER`, `ROLE_ADMIN` | `201 Created`, `401 Unauthorized` |
| `GET` | `/api/ai/conversations` | Lists conversations owned by the caller (ordered by activity) | `ROLE_USER`, `ROLE_ADMIN` | `200 OK`, `401 Unauthorized` |
| `GET` | `/api/ai/conversations/{id}/messages` | Retrieves message history for the specified conversation | Owner only | `200 OK`, `401 Unauthorized`, `404 Not Found` |
| `POST` | `/api/ai/chat` | Sends a message, builds bounded context, executes tools, persists turns | Owner only | `200 OK`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`, `503 Unavailable` |

---

## 4. Multi-Turn Context & Anti-Hallucination Grounding

### 4.1 Context Ingestion Pipeline
1. When `POST /api/ai/chat` is invoked, the server resolves `user_id` from the verified JWT.
2. The user's prompt is saved as turn `N` with sequence number `maxSeq + 1`.
3. The server retrieves up to the last 20 messages for the conversation, ordering them chronologically.
4. Each prior user and assistant turn is formatted into standard `AiProviderMessage` items.
5. The system instruction strictly enforces that historical messages do **not** confer authoritative facts:
   > *"L'historique des échanges précédents sert UNIQUEMENT de contexte conversationnel. L'HISTORIQUE NE CONSTITUE EN AUCUN CAS UNE SOURCE D'AUTORITÉ POUR LES FAITS EN TEMPS RÉEL. Pour toute question de suivi portant sur des faits réels, VOUS DEVEZ SYSTÉMATIQUEMENT RÉEXÉCUTER L'OUTIL CORRESPONDANT."*
6. If the user asks a follow-up (e.g. *"Et pour demain ?"* or *"Convertis 100 EUR en MAD pour mon voyage"*), the LLM invokes the relevant tool (`getWeather`, `convertCurrency`, `searchFlights`, etc.).
7. The assistant response and all executed tool records are persisted with sequence number `maxSeq + 2`.

---

## 5. Security & IDOR Defense

- **Principal Validation**: The downstream `ai-service` independently decodes the RS256 JWT and extracts `jwt.getSubject()` as the authoritative user UUID.
- **Resource Ownership**: Before reading or appending to a conversation, `AiConversationService` checks `conversation.getUserId().equals(currentUserId)`.
- **404 Masking**: If a user attempts to access or message another user's conversation ID, the service returns `404 Not Found` (rather than `403 Forbidden`) to prevent conversation ID enumeration attacks.
- **Data Sanitization**: Before storing tool arguments and result summaries in `ai.tool_calls`:
  - Fields containing `token`, `password`, `key`, `secret`, `cvv`, `pan`, `authorization`, or `thoughtSignature` are strictly stripped.
  - No raw third-party vendor JSON is dumped directly into relational storage.

---

## 6. Frontend Experience (`frontend/web`)

- **`<AiChatWidget />`**:
  - Automatically loads the user's active or latest conversation on open.
  - Remembers active conversation in `sessionStorage` (`yuding_ai_active_conv`).
  - Includes a conversation drawer button displaying the conversation count and thread history.
  - Includes a "Nouvelle conversation" button (`+`) that immediately provisions a fresh server conversation thread.
  - Automatically titles new conversations from the first user prompt (first 57 characters + `...`).
  - Clear logout lifecycle: when `isAuthenticated` transitions to false, conversation cache, messages, and `sessionStorage` keys are wiped cleanly.

---

## 7. Verification Summary

- **Flyway Migration V24**: Applied to PostgreSQL 16 cluster on port 5433 with 0 errors.
- **Backend Test Suite**: 39 automated unit and security tests in `ai-service` passing (including IDOR tests and multi-turn execution).
- **Frontend Test Suite**: 137 unit and service contract tests in `frontend/web` passing.
- **Production Next.js Build**: Completed cleanly (`next build` 0 errors).
- **Live Gateway Integration QA**:
  - User A created thread `Preparation voyage Maroc`.
  - Sent weather query -> grounded with live `getWeather`.
  - Sent follow-up currency query -> grounded with live `convertCurrency`.
  - Verified 4 messages persisted in PostgreSQL.
  - User B attempted to read User A's thread -> blocked with `404 Not Found`.
  - User B attempted to inject into User A's thread -> blocked with `404 Not Found`.
  - Restarted `ai-service` daemon -> full conversation history restored from database through Gateway.
