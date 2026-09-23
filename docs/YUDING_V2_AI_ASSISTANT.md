# Yuding V2 — AI Assistant Architecture (Phase 44)

## 1. Overview & Architectural Boundaries

Phase 44 establishes the foundation for Yuding V2's AI conversational travel experience. It replaces the legacy prototype (`GET /ai/{question}` with user prompts in URL paths) with a secure, provider-neutral, resilient assistant architecture.

```
                              ┌──────────────────────────────────────────────┐
                              │           Frontend (Next.js App)             │
                              │           <AiChatWidget />                   │
                              └──────────────────────┬───────────────────────┘
                                                     │ POST /api/ai/chat (Bearer JWT)
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │            API Gateway (:8888)               │
                              │            Route: /api/ai/**                 │
                              │  • Rate Limiting (100 req/min)               │
                              │  • Header Sanitization                       │
                              │  • Path Routing                              │
                              └──────────────────────┬───────────────────────┘
                                                     │ POST /api/ai/chat (Forwarded)
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │          AI Service (:7777)                  │
                              │  • RS256 JWT Defense-in-Depth Validation     │
                              │  • Request Validation (UUID, length <= 8000) │
                              │  • AiChatService Coordinator                 │
                              │  • Travel Truth Rule System Prompt           │
                              └──────────────┬───────────────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │ (Primary)                                 │ (Fallback on 429/5xx/timeout)
                       ▼                                           ▼
         ┌───────────────────────────┐               ┌───────────────────────────┐
         │     GeminiAiProvider      │               │      GroqAiProvider       │
         │     gemini-3.8-flash      │               │    openai/gpt-oss-120b    │
         │ (Google Generative AI API)│               │      (Groq Cloud API)     │
         └───────────────────────────┘               └───────────────────────────┘
```

---

## 2. Provider-Neutral Abstraction

All AI communication is decoupled behind the `AiProvider` interface:

```java
public interface AiProvider {
    AiProviderType getProviderType();
    boolean isAvailable();
    AiChatResult chat(AiChatCommand command);
}
```

### 2.1 Configured Providers

| Role | Provider | Model | Endpoint | Protocol |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | Google Gemini (`GEMINI`) | `gemini-3.8-flash` | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | REST / JSON |
| **Fallback** | Groq (`GROQ`) | `openai/gpt-oss-120b` | `https://api.groq.com/openai/v1/chat/completions` | OpenAI-compatible REST / JSON |

Both adapters use Spring Framework's modern `RestClient` with configured connect/read timeouts (default: 30s) and resilient TLS socket factory handling for platform portability.

---

## 3. Strict Transient Fallback Policy

Fallback between providers is strictly governed by `AiChatService`:

1. **Transient Errors (Eligible for Fallback):**
   - HTTP 429 (Rate Limit / Quota Exceeded)
   - HTTP 503 (Service Unavailable / High Demand Spikes)
   - HTTP 502 / 504 (Bad Gateway / Gateway Timeout)
   - Connection timeouts and network partition errors (`ResourceAccessException`)
2. **Non-Transient Errors (NEVER Fallback):**
   - HTTP 400 (Bad Request / Invalid Prompt Payload)
   - HTTP 401 / 403 (Invalid API Key or Authorization Failure)
   - Client validation errors (Conversation ID missing, prompt oversized)
3. **Behavior:**
   - If the primary provider throws a transient exception and `yuding.ai.fallback-enabled=true`, the fallback provider is immediately invoked.
   - If both providers fail or are unavailable, a normalized HTTP 503 Service Unavailable is returned with a user-friendly message, preventing stack trace or provider internal leaks.

---

## 4. Prompt Safety & Live Travel Truth Rule

The AI assistant operates under a strict, immutable system instruction:

```
Vous êtes l'assistant de voyage officiel de Yuding (Yuding Assistant).
Votre mission est de conseiller et guider les voyageurs : recommandations de destinations, idées d'itinéraires, conseils culturels et pratiques.

DIRECTIVES IMPORTANTES :
1. Répondez dans la langue utilisée par le voyageur (par défaut en français).
2. Soyez concis, accueillant, précis et bienveillant.
3. RÈGLE DE VÉRITÉ ABSOLUE : Vous n'avez pas accès aux disponibilités en direct, aux tarifs en temps réel des prestataires, ni à l'état des réservations ou des comptes.
4. Vous ne devez JAMAIS inventer de prix en direct, de disponibilités de chambres ou de vols, ni de numéros de dossier ou de confirmation.
5. Vous ne pouvez en aucun cas effectuer de réservation, de modification, d'annulation ou de paiement.
6. Pour réserver ou consulter les tarifs en temps réel, invitez toujours le voyageur à utiliser les fonctionnalités de recherche officielles de Yuding (Vols, Hôtels, Activités, Trains, Transferts).
```

---

## 5. Canonical REST API Contract

### Request: `POST /api/ai/chat` (alias: `POST /ai/chat`)

- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <RS256-JWT>`
- **Payload:**
  ```json
  {
    "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "message": "Quels sont les incontournables à visiter à Kyoto ?"
  }
  ```
- **Validation Rules:**
  - `conversationId`: Not null, valid UUID.
  - `message`: Not blank, maximum length: 8,000 characters.

### Response: `200 OK`

```json
{
  "conversationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "messageId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "role": "assistant",
  "content": "À Kyoto, ne manquez pas le sanctuaire Fushimi Inari, le temple Kinkaku-ji...",
  "createdAt": "2026-09-23T20:30:00Z"
}
```

### Error Responses

- `400 Bad Request`: Validation failure (empty message, message > 8,000 chars, invalid UUID).
- `401 Unauthorized`: Missing or invalid RS256 JWT access token.
- `503 Service Unavailable`: All AI providers temporarily unreachable or rate-limited.

---

## 6. Security, Zero Trust & Defense-in-Depth

1. **Gateway Enforcement:**
   - Routes `/api/ai/**` and `/ai/**` to `lb://AI-SERVICE`.
   - Strips client-supplied identity headers (`X-User-*`).
   - Applies rate limiting (100 tokens burst, 50 replenish rate).
2. **Downstream Service Enforcement:**
   - `ai-service` independently verifies the RS256 JWT using `certs/public.pem`.
   - Never trusts unauthenticated callers; returns `401 Unauthorized` directly if JWT is missing or invalid.
3. **Credential Protection:**
   - Secrets are loaded exclusively from local `.env.local` or OS environment variables.
   - Provider keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) are NEVER sent to the browser, logged, or included in build artifacts.
4. **URL Safety:**
   - Zero user messages or prompts in URL path parameters (eliminating URL logging and browser history leakage).

---

## 7. Frontend Integration (`frontend/web`)

- **Service:** `src/services/ai.service.ts` wraps `apiClient.post('/api/ai/chat', request, true)`.
- **Component:** `src/components/ai/AiChatWidget.tsx` provides:
  - Floating trigger button with live pulse badge in Yuding brand palette (`#087d70`).
  - Drawer window with conversation reset, quick suggestion chips, and responsive layout.
  - XSS-safe rendering for bullet lists, numbered lists, and bold text formatting.
  - Shift+Enter for newlines, Enter to submit.
  - Animated typing indicator during generation.
  - Unauthenticated banner directing users to `/login` if not authenticated.
- **Mount Point:** Mounted globally in `src/app/layout.tsx` within `<AuthProvider>`, enabling AI assistance across all site pages.

---

## 8. Verification & Test Coverage

1. **Backend Unit & Integration Tests (`backend/ai-service`):**
   - `AiChatServiceTest`: Primary success, transient 429 triggering Groq fallback, non-transient 401 skipping fallback, disabled fallback, prompt injection with travel truth rule, input validation (null UUID, blank, >8000 chars).
   - `AiChatControllerSecurityTest`: Anonymous access rejected with 401, authenticated access succeeds with 200, invalid payload returns 400 with `validationErrors`, provider failure returns 503.
   - `AiLiveProviderIntegrationTest`: Live provider verification against Google Gemini (`gemini-3.8-flash`) and Groq (`openai/gpt-oss-120b`).
2. **Frontend Contract Tests (`frontend/web`):**
   - `src/lib/__tests__/ai-assistant.test.ts`: Verifies routing to Gateway (`/api/ai/chat`), authorization header forwarding, payload structure, port isolation, and 429/503 error handling.
   - TypeScript compilation (`npx tsc --noEmit`) passes with zero errors.
   - Production build (`npm run build`) passes with all 23 static/dynamic routes optimized.

---

## 9. Phase 45 Evolution — Tool Calling & Grounded Travel Answers

In Phase 45, the AI Assistant was upgraded from text-only guidance to **live-grounded tool calling**:
- **7 Read-Only Tools:** `searchFlights`, `searchHotels`, `searchActivities`, `searchTransfers`, `getWeather`, `convertCurrency`, `getBookingStatus`.
- **Bounded Tool Loop:** Max 3 rounds, max 6 tool executions, 12s timeout per tool.
- **Request-Scoped Deduplication:** Prevents redundant external calls within the same conversational turn.
- **IDOR Protection:** `getBookingStatus` forwards caller RS256 JWT tokens for server-side ownership enforcement and applies data minimization.
- **Grounding Telemetry:** `AiChatResponse` carries `grounded: boolean` and `toolsUsed: string[]`, rendering a `[🛡️ Données Yuding vérifiées en direct]` badge in `AiChatWidget.tsx`.

For complete details, see [YUDING_V2_AI_TOOL_CALLING.md](file:///docs/YUDING_V2_AI_TOOL_CALLING.md).

