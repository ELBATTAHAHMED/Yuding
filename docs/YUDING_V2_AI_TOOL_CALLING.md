# Yuding V2 — AI Tool Calling & Grounded Travel Answers (Phase 45)

## 1. Overview & Architectural Boundaries

Phase 45 equips Yuding V2's AI Assistant with **provider-neutral tool calling capabilities**, enabling **Gemini 3.8 Flash** (primary) and **Groq (`openai/gpt-oss-120b`)** (fallback) to query real-time travel inventory, live weather forecasts, official currency conversion rates, and public booking status.

By connecting the LLM to Yuding's real backend services via strictly read-only tools, hallucinations are eliminated while enforcing strict security, data minimization, and privacy guardrails.

```
                    ┌─────────────────────────┐
                    │      AiChatService      │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       ┌──────────────────┐            ┌──────────────────┐
       │ GeminiAiProvider │            │  GroqAiProvider  │
       │ (functionCall)   │            │   (tool_calls)   │
       └─────────┬────────┘            └─────────┬────────┘
                 │                               │
                 └───────────────┬───────────────┘
                                 │ Provider-neutral AiToolCall
                                 ▼
                     ┌───────────────────────┐
                     │    AiToolExecutor     │ (bounded loop, deduplication, 12s timeout)
                     └───────────┬───────────┘
                                 │
        ┌──────────────┬─────────┴────────┬──────────────┐
        ▼              ▼                  ▼              ▼
  ┌───────────┐  ┌───────────┐      ┌───────────┐  ┌──────────────────┐
  │FlightTool │  │ HotelTool │  ... │WeatherTool│  │BookingStatusTool │
  └─────┬─────┘  └─────┬─────┘      └─────┬─────┘  └────────┬─────────┘
        │              │                  │                 │
        ▼              ▼                  ▼                 ▼
  ┌─────────────────────────────────────────────┐  ┌──────────────────┐
  │         travel-service (port 8082)          │  │reservation-serv. │
  │    (flights, hotels, weather, currency)     │  │   (port 8084)    │
  └─────────────────────────────────────────────┘  └──────────────────┘
```

---

## 2. Provider-Neutral Tool Abstraction

Tools are decoupled from specific LLM vendor protocols through the core interfaces in `com.ahmed.aiservice.domain.tool`:

### 2.1 Core Contracts
- **`AiToolDefinition`**: Formal declaration of tool name, description, and standard JSON Schema parameter specifications.
- **`AiToolCall`**: Provider-neutral model tool request (`id`, `name`, `arguments`).
- **`AiToolResult`**: Normalized tool execution output (`callId`, `toolName`, `status`, `data`, `errorMessage`).
- **`AiToolExecutionContext`**: Carries authenticated caller security credentials (`jwtToken`, `userId`, `roles`) for defense-in-depth downstream calls.
- **`AiTool`**: Interface implemented by all tool providers:
  ```java
  public interface AiTool {
      AiToolDefinition getDefinition();
      AiToolResult execute(AiToolCall call, AiToolExecutionContext context);
  }
  ```
- **`AiToolRegistry`**: Spring component automatically discovering and indexing all active `AiTool` beans.
- **`AiToolExecutor`**: Manages execution with request-scoped caching, timeout protection (12s), and exception containment.

---

## 3. The 7 Grounded Read-Only Tools

Phase 45 strictly implements **EXACTLY 7 read-only tools**:

| Tool Name | Target Microservice & Route | Description & Parameters | Validation & Privacy Rules |
| :--- | :--- | :--- | :--- |
| **`searchFlights`** | `travel-service` `POST /travel/flights/search` | Search available flights by origin, destination, and dates. | Origin/Destination must be 3-letter IATA codes (`^[A-Z]{3}$`). Date format `YYYY-MM-DD`. Max 5 results returned. |
| **`searchHotels`** | `travel-service` `POST /travel/hotels/search` | Search hotels by destination city, check-in, and check-out. | Destination min 2 chars. Dates `YYYY-MM-DD`. Max 5 results returned with nightly & total prices. |
| **`searchActivities`** | `travel-service` `POST /travel/activities/search` | Search tourist activities, guided tours, and experiences. | Destination min 2 chars. Max 5 results returned. |
| **`searchTransfers`** | `travel-service` `POST /travel/transfers/search` | Search private transfers, taxis, and airport shuttles. | Pickup and dropoff locations cannot be identical. Date and time validated. Max 5 results returned. |
| **`getWeather`** | `travel-service` `GET /travel/weather` | Fetch current weather and multi-day forecasts for a location. | Automatically invokes geocoding (`GET /travel/geo/geocode`) if latitude/longitude coordinates are not supplied. |
| **`convertCurrency`** | `travel-service` `GET /travel/currency/convert` | Convert amounts between currencies using official rates. | 3-letter uppercase ISO currency codes (`^[A-Z]{3}$`). Positive amounts only. Calculated with `BigDecimal`. |
| **`getBookingStatus`** | `reservation-service` `GET /bookings/{reference}` | Query public booking status using reference `YUD-XXXXXXXX`. | **IDOR Prevention:** Requires caller JWT token. Downstream enforces ownership. Data minimization: only returns status, product type, paid flag. Customer PII stripped. |

---

## 4. Guardrails & Safety Constraints

### 4.1 Strict Read-Only Boundary
- The AI Assistant has **ZERO transactional capabilities**:
  - Cannot create bookings (`POST /bookings` is prohibited).
  - Cannot process payments (`POST /payments` is prohibited).
  - Cannot modify or cancel reservations.
  - Cannot process refunds.
- If a user expresses transactional intent, the assistant directs them to use Yuding's secure web booking interface.

### 4.2 Rail (Trains) Tool Exclusion
- Phase 45 explicitly does not include a `searchTrains` tool; rail queries are directed to Yuding's official train search page until supplier contracts are completed.

### 4.3 Database & Schemas
- **Zero Flyway migrations:** Phase 45 introduces no database modifications. Durable conversation persistence is owned by Phase 46.

---

## 5. Bounded Tool Loop & Circuit Breaking

The orchestration loop in `AiChatService` enforces hard operational limits:

```java
AI_MAX_TOOL_ROUNDS = 3              // Max turns of tool requests -> responses -> re-prompt
AI_MAX_TOOL_CALLS_PER_REQUEST = 6   // Hard ceiling on total tool executions per user message
AI_TOOL_TIMEOUT_SECONDS = 12        // Max execution time per individual tool call
AI_MAX_TOOL_RESULTS = 5             // Max items returned to LLM per search tool
```

### 5.1 Request-Scoped Deduplication
Within a single user chat invocation, the `AiToolExecutor` maintains a request-scoped cache keyed by `(toolName + ":" + canonicalArguments)`. If the LLM requests identical tool calls in consecutive rounds, the cached output is returned immediately without contacting downstream microservices.

### 5.2 Provider Fallback with Active Tools
If the primary provider (**Gemini 3.8 Flash**) fails with a transient error (HTTP 429 rate limit, 5xx server error, or network timeout) during any round of the tool execution loop:
1. `AiChatService` captures the exception.
2. The entire conversation state (including system prompt, user prompt, previous assistant tool calls, and tool outputs) is passed to the fallback provider (**Groq `openai/gpt-oss-120b`**).
3. Groq continues the conversation seamlessly with the full list of tool definitions.

---

## 6. Provider Protocol Adapters

### 6.1 Google Gemini (`GeminiAiProvider`)
- Maps `AiToolDefinition` into Gemini `functionDeclarations` with OpenAPI-compatible types (`STRING`, `INTEGER`, `NUMBER`, `OBJECT`, `ARRAY`).
- Extracts model `functionCall` objects from `candidates[0].content.parts`.
- Encapsulates tool responses in `functionResponse` parts within a user turn.

### 6.2 Groq Cloud (`GroqAiProvider`)
- Maps `AiToolDefinition` into OpenAI-compatible `tools` array (`type: "function"`).
- Extracts model `tool_calls` from `choices[0].message.tool_calls`.
- Encapsulates tool responses as separate messages with `role: "tool"` and `tool_call_id`.

---

## 7. Frontend Integration & Grounded Response Badging

### 7.1 Response Metadata
`AiChatResponse` includes grounding telemetry:
- `grounded`: `boolean` (true if at least one tool was executed to formulate the response).
- `toolsUsed`: `List<String>` (unique names of tools executed, e.g. `["searchFlights"]`).

### 7.2 UI Indicator
In `AiChatWidget.tsx`, grounded responses display a distinct verification badge:
```
[🛡️ Données Yuding vérifiées en direct]
```
This informs travelers that prices, schedules, and availability were fetched in real-time from official Yuding providers.

---

## 8. Verification & Offline Test Isolation

- **Default Test Suite (100% Offline):**
  - All unit and security tests run strictly offline with zero network calls and zero dependency on live API keys.
  - `AiLiveProviderIntegrationTest` is gated behind `AI_LIVE_TESTS=true` using JUnit 5 `Assumptions.assumeTrue`.
- **Run Offline Tests:**
  ```powershell
  mvn test
  ```
- **Run Live Opt-In Integration Tests:**
  ```powershell
  mvn test -DAI_LIVE_TESTS=true
  ```
