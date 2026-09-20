# Yuding V2 — Real Flights with Scrappa (Phase 22)

## 1. Overview & Architecture

Phase 22 integrates the first real travel provider into Yuding V2: **Scrappa Google Flights API**.

Flight searches transition from placeholder/stub behavior to live external lookups while strictly preserving the provider-neutral architecture established in Phase 21.

### End-to-End Flow
```
Next.js Frontend (/flights)
      │  (POST /travel/flights/search)
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
- **Configuration Template**: `backend/travel-service/.env.example` provides the template with placeholders only.
- **Process Environment**: `scripts/start-travel-service.ps1` sets environment variables only within the local PowerShell process scope before launching Spring Boot.
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

## 4. Error Mapping

| Scrappa HTTP Status | Yuding ProviderErrorCode | GlobalExceptionHandler HTTP Status | Description |
|---|---|---|---|
| 401 | `PROVIDER_AUTHENTICATION_FAILED` | 502 Bad Gateway | Invalid or missing API key |
| 402 | `PROVIDER_QUOTA_EXHAUSTED` | 502 Bad Gateway | Scrappa credits exhausted |
| 422 | `PROVIDER_REQUEST_INVALID` | 400 Bad Request | Invalid search parameters / dates |
| 429 | `PROVIDER_RATE_LIMITED` | 429 Too Many Requests | Rate limit reached |
| 500 / 503 / 5xx | `PROVIDER_UNAVAILABLE` | 503 Service Unavailable | Scrappa upstream failure |
| Timeout | `PROVIDER_TIMEOUT` | 504 Gateway Timeout | Connect or read timeout exceeded |

---

## 5. Testing & Verification

### Unit & Mocked Tests (Credit-Safe)
All unit and regression tests use OkHttp `MockWebServer`. No real Scrappa credits are consumed during normal test runs:
- `ScrappaClientTest`: Verifies query construction, header injection, IATA parsing, and all HTTP error mappings (15 test cases).
- `ScrappaTravelProviderTest`: Verifies normalization of one-way and round-trip responses, multi-leg flight mapping, `BigDecimal` precision, and capability constraints.
- `TravelProviderSwappabilityTest`: Verified swappability between stub and real providers.

### Gated Live Smoke Test
- `ScrappaLiveSmokeTest`: Gated by `@EnabledIfEnvironmentVariable(named = "SCRAPPA_LIVE_TEST", matches = "true")`.
- Execution: `CMN → CDG`, future date, 1 adult, economy.
- Result: **SUCCESS** — returned 9 real flight offers from Royal Air Maroc (`AT`) starting at 116 EUR (direct, 185 minutes).
