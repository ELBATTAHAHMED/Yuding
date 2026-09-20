# Yuding V2 — Real Flights with Scrappa (Phase 22)

## 1. Overview & Architecture

Phase 22 integrates the first real travel provider into Yuding V2: **Scrappa Google Flights API**.

Flight searches transition from placeholder/stub behavior to live external lookups while strictly preserving the provider-neutral architecture established in Phase 21.

### End-to-End Flow
```
Next.js Frontend (/flights)
      │  (GET /travel/airports - TanStack Query cached 24h)
      │  (POST /travel/flights/search - Selected IATA codes only)
      ▼
Spring Cloud Gateway (port 8888)
      │  (Route: TRAVEL-SERVICE)
      ▼
travel-service (port 8082)
      │  TravelSearchService
      ▼
TravelProviderRegistry
      │  Resolves provider bean "SCRAPPA" based on travel.providers.flights=scrappa
      ▼
ScrappaTravelProvider
      │  Maps Yuding FlightSearchQuery -> Scrappa query parameters
      ▼
ScrappaClient (RestClient)
      │  Header: X-API-KEY: <backend-secret>
      ▼
Scrappa API (https://scrappa.co/api)
      │
      ▼
Response Normalization -> FlightOfferDto (with legs, duration, stops, price in BigDecimal)
      │
      ▼
TravelSearchResponse<FlightOfferDto>
```

---

## 2. Security & Secret Handling

- **Key Isolation**: `SCRAPPA_API_KEY` is strictly a backend secret. It is never sent to the browser, never referenced in `NEXT_PUBLIC_*` variables, and never forwarded across the Gateway.
- **Local Secret Loading**: Local development loads secrets from `backend/travel-service/.env.local`. This file is matched by `.gitignore` (`.env.*` rule) and is never committed.
- **Automatic Startup Load**: `TravelServiceApplication` automatically parses `.env.local` on startup if present, injecting keys into the local process environment without leaking values.
- **Configuration Template**: `backend/travel-service/.env.example` provides the template with placeholders only.
- **Safe Logging**: The API key is never logged. Log statements only record high-level search metadata (origin, destination, date, passenger count, result count). Response bodies and raw credentials are never printed.

---

## 3. Scrappa API Contract & Integration

### Verified Endpoints
1. **One-Way Flight Search**:
   - `GET https://scrappa.co/api/flights/one-way`
   - Parameters: `origin`, `destination`, `departure_date`, `adults`, `children`, `infants_on_lap`, `cabin_class`, `max_stops`, `currency`.

2. **Round-Trip Flight Search (V2)**:
   - `GET https://scrappa.co/api/flights/v2/round-trip`
   - Parameters: `origin`, `destination`, `departure_date`, `return_date`, `departure_token` (optional for second stage), passenger counts, filters.
   - Stage 1 (no departure token): Returns outbound flights with `itinerary_complete: false`, `price_type: "round_trip_starting"`, and an opaque `departure_token`.
   - Credit Protection: Automatic second-stage fan-out is explicitly disabled. Outbound results are normalized with `itineraryComplete=false` and preserve `departureToken`.

3. **Airports Directory**:
   - `GET https://scrappa.co/api/flights/airports` (Free endpoint, 0 credits billed).
   - Returns major hubs with IATA codes, names, cities, and countries.
   - Backend `TravelSearchService` enriches this with key Moroccan/regional airports (`CMN`, `RAK`, `RBA`, `TNG`, `AGA`, `FEZ`, `NDR`, `OUJ`, `OZZ`, `ORY`, etc.) and caches in-memory to prevent repeated provider lookups.
   - Exposed as `GET /travel/airports` to the frontend via Gateway.

### Domain Decisions
- **Infants**: Mapped to `infants_on_lap`. `infants_in_seat` is omitted because Yuding's UI passenger counter represents lap infants by default.
- **IATA Extraction**: Inputs like `"Casablanca (CMN)"` or bare `"CMN"` are parsed to extract the 3-letter uppercase IATA code required by Scrappa.
- **Cabin Class Mapping**:
  - `ECONOMY` → `economy`
  - `PREMIUM_ECONOMY` → `premium_economy`
  - `BUSINESS` → `business`
  - `FIRST` → `first`
- **Non-Stop**: `nonStop=true` maps to `max_stops=nonstop`.
- **Currency & Money**: Prices are modeled as `BigDecimal` throughout backend DTOs to avoid floating-point inaccuracies.
- **Capabilities**: `ScrappaTravelProvider` supports `FLIGHTS` only. `HOTELS`, `ACTIVITIES`, and `TRANSFERS` throw `CAPABILITY_NOT_SUPPORTED`. `REVALIDATION` is reserved for Phase 36.

---

## 4. Frontend Airport Selection UX

- **AirportSelector Component** (`src/components/travel/AirportSelector.tsx`):
  - Autocomplete search supporting case-insensitive lookup across airport code, airport name, city, and country.
  - Keyboard navigation (ArrowUp, ArrowDown, Enter to select, Escape to close).
  - Clear/reset button for easy re-selection.
  - Accessible listbox with top 6 matching suggestions.
- **TanStack Query Caching**:
  - `useAirportsQuery` fetches `/travel/airports` with `staleTime: 24h`.
  - Zero network calls on keystroke — filtering is performed locally in the browser.
- **Search Validation**:
  - Requires a valid selected origin and destination airport.
  - Validates `origin !== destination`.
  - Sends ONLY the 3-letter IATA code (`origin: "CMN"`, `destination: "CDG"`), never raw city names.

---

## 5. Error Mapping

| Scrappa HTTP Status | Yuding ProviderErrorCode | GlobalExceptionHandler HTTP Status | Description |
|---|---|---|---|
| 401 | `PROVIDER_AUTHENTICATION_FAILED` | 502 Bad Gateway | Invalid or missing API key |
| 402 | `PROVIDER_QUOTA_EXHAUSTED` | 502 Bad Gateway | Scrappa credits exhausted |
| 422 | `PROVIDER_REQUEST_INVALID` | 400 Bad Request | Invalid search parameters / dates |
| 429 | `PROVIDER_RATE_LIMITED` | 429 Too Many Requests | Rate limit reached |
| 500 / 503 / 5xx | `PROVIDER_UNAVAILABLE` | 503 Service Unavailable | Scrappa upstream failure |
| Timeout | `PROVIDER_TIMEOUT` | 504 Gateway Timeout | Connect or read timeout exceeded |

---

## 6. Testing & Live Verification

### Unit & Mocked Tests (Credit-Safe)
All unit and regression tests use OkHttp `MockWebServer`. No real Scrappa credits are consumed during test runs:
- `ScrappaClientTest`: Verifies query construction, header injection, IATA parsing, airport directory parsing, and all HTTP error mappings (17 test cases).
- `ScrappaTravelProviderTest`: Verifies normalization of one-way and round-trip responses, multi-leg flight mapping, `BigDecimal` precision, airport normalization, and capability constraints.
- `TravelSearchControllerTest`: Verifies public endpoints including `GET /travel/airports` and `POST /travel/flights/search`.
- Frontend tests (`travel-search.test.ts`): Verifies `/travel/airports` route, clean IATA code transmission, and no direct port calls.

### Gateway End-to-End Verification
- **CMN → CDG** (2026-11-15, 1 adult, economy):
  - **SUCCESS** — Returned 9 real flight offers from Royal Air Maroc (`AT`) starting at 116 EUR (direct, 185 min), Air France (`AF`), Lufthansa (`LH`).
- **CMN → RAK** (2026-11-15, 1 adult, economy):
  - **SUCCESS** — Returned 7 real flight offers from Royal Air Maroc (`AT 401` & `AT 403` direct) starting at 102 EUR, TAP Air Portugal (`TP`), Iberia (`IB`), Air France (`AF`).
- **Empty State Verification**:
  - Non-existent/no-flight route returns `totalResults: 0` with a clean `No flights found` state message in the UI without fabricating data.
