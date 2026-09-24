# Yuding V2 — Smart Trip Planner Architecture & Specification

## 1. Overview & Objectives
The **Smart Trip Planner** is Yuding V2's intelligent travel orchestration engine implemented in `ai-service` and surfaced through the Next.js frontend at `/planifier` and through the AI Chatbot via the `planTrip` function tool.

The engine coordinates real, read-only data across Yuding's microservices ecosystem:
- **Flights**: Outbound & return flight offers via `travel-service` (`/travel/flights/search`).
- **Hotels**: Lodging options matching budget, destination city, and guest count (`/travel/hotels/search`).
- **Activities**: Curated experiences, museum visits, food tours (`/travel/activities/search`).
- **Transfers**: Private car or taxi transit (`/travel/transfers/search`).
- **Weather Forecast**: Short-term horizon forecast (≤ 14 days) via `travel-service` (`/travel/weather`).
- **Currency Conversion**: Authoritative conversion rates (`/travel/exchange-rates`).
- **RAG Knowledge Base**: Destination guide integration via Phase 47 PgVector store (`ai.knowledge_chunks`).

---

## 2. Server-Authoritative Budget Engine
Financial computations strictly adhere to Yuding's financial rules:
- **Data Types**: All prices, sums, and budget balances are represented exclusively using `BigDecimal` with 2 decimal places and `RoundingMode.HALF_UP`.
- **Authoritative Source**: Prices are resolved directly from provider quotes and candidate items. Client-supplied price estimates are discarded.
- **Budget Status Enum**:
  - `WITHIN_BUDGET`: Every selected component has a resolved, authoritative price and `totalPriced <= totalBudget`.
  - `OVER_BUDGET`: The sum of priced items exceeds the requested budget (`totalPriced > totalBudget`).
  - `PARTIALLY_PRICED`: One or more selected items could not be priced (marked `UNPRICED`), preventing an authoritative final total.
- **Missing / Unpriced Items**: If an item does not have a confirmed price, its price is recorded as `null` with pricing status `UNPRICED`. **Unpriced items are NEVER assigned `0.00`**, preventing false "free" totals.

---

## 3. Candidate Offer Validation & Hallucination Prevention
To prevent LLM hallucination of non-existent travel offers:
- All flight, hotel, and activity candidate IDs are sourced from verified `travel-service` search responses.
- The planner verifies candidate availability and attributes prior to assembling the final itinerary.
- When no candidate is available (e.g. provider downtime or out-of-range dates), the plan gracefully records `None` or an unpriced recommendation accompanied by an explanation.

---

## 4. Structured Persistence & Schema Design
Applied via Flyway migration `V26__ai_trip_planner_and_attachments.sql` in schema `ai`:
- **`ai.trip_plans`**: Master plan table.
  - `id`: UUID primary key.
  - `user_id`: Owning user ID (enforces strict ownership and IDOR defense).
  - `reference`: Human-readable reference format `TRP-XXXXXXXX` (e.g. `TRP-82QD5J5E`).
  - `title`, `origin_city`, `destination_city`, `start_date`, `end_date`, `travelers_count`, `preferences`.
  - `budget_amount`, `budget_currency`, `budget_status`, `priced_total`, `unpriced_items_count`.
  - `weather_summary`, `rag_knowledge_summary`, `created_at`, `updated_at`.
- **`ai.trip_plan_days`**: Day-by-day scheduling (`day_number`, `date`, `theme`, `notes`).
- **`ai.trip_plan_items`**: Itinerary items per day (`item_type`: FLIGHT, HOTEL, ACTIVITY, TRANSFER, MEAL; candidate IDs, provider names, `amount`, `currency`, `pricing_status`).

---

## 5. Security & Access Control
- **Defense-in-Depth & Anti-IDOR**: All REST endpoints (`/api/ai/trip-plans/**`) verify that the authenticated user (`X-User-Id` injected by `gateway-service`) strictly owns the requested trip plan.
  - Cross-user queries immediately return `404 NOT_FOUND` (preventing ID enumeration).
- **Zero Transactional AI Execution**: The Trip Planner is strictly read-only and exploratory. No booking creation or payment authorization is ever triggered by trip planning or chat tools.

---

## 6. REST API Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/trip-plans` | Generates a new trip plan from structured criteria. |
| `GET` | `/api/ai/trip-plans` | Lists the authenticated user's trip plans. |
| `GET` | `/api/ai/trip-plans/{ref}` | Retrieves a trip plan by reference `TRP-XXXXXXXX`. |
| `POST` | `/api/ai/trip-plans/{ref}/refresh` | Re-queries travel providers for live rates and refreshes the plan. |

---

## 7. Frontend Integration (`/planifier`)
Located in `frontend/web/src/app/(public)/planifier/`:
- **Interactive Planner Form**: Inputs for origin, destination, departure/return dates, traveler count, budget, and preference tags.
- **Metric Cards**: Real-time display of total budget, confirmed priced items, and budget status badge (`WITHIN_BUDGET`, `OVER_BUDGET`, `PARTIALLY_PRICED`).
- **Day-by-Day Timeline**: Rich collapsible itinerary with flights, lodging, activities, and daily travel notes.
- **RAG Knowledge & Citations**: Direct reference to destination guides (`DOC-DST-002`, etc.).
- **Refresh Action**: Single-click re-evaluation against current provider availability.
