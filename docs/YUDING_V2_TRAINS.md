# Yuding V2 — Provider-Backed Trains Feature (Transitland / ONCF)

**Status:** COMPLETED (Supplemental Feature after Phase 25)  
**Branch:** `develop-v2`  
**Provider Suite:** Transitland REST API v2 (`f-oncf~morocco~rail` / `o-oncf~morocco`)  

---

## 1. Overview & Architectural Role

The Trains feature introduces provider-backed timetable and route schedule search for Moroccan rail services (ONCF — Office National des Chemins de Fer) using the Transitland REST API v2.

This feature is designed as a standalone, provider-backed search integration strictly adhering to Yuding's Data Integrity and Truth-in-Advertising principles:
- **Mandatory Data Freshness Gate:** GTFS feeds have fixed calendar service windows. Yuding enforces an explicit server-side freshness check. If a user queries dates past the feed validity window, the system returns `SCHEDULE_DATA_OUTDATED` (HTTP 422) and provides an immediate redirect to the official ONCF portal ([oncf-voyages.ma](https://www.oncf-voyages.ma)).
- **Zero Price Invention:** GTFS data for ONCF does not carry fare rules. Train offers explicitly return `price = null` with user-facing notification *"Tarif non disponible via cette source"*. Never display fake prices or $0.
- **Zero Fake Bookings / Live Availability:** Train search is informational for timetable planning. Direct ticket booking is linked to official ONCF reservation channels.

### Complete Provider Topology
| Vertical | Provider | Protocol / Version | Port / Service | Base URL |
|---|---|---|---|---|
| **FLIGHTS** | `SCRAPPA` | Google Flights Scraper | `travel-service:8082` | `https://scrappa.co/api` |
| **HOTELS** | `NUITEE` | LiteAPI v3 Sandbox | `travel-service:8082` | `https://api.liteapi.travel/v3.0` |
| **ACTIVITIES** | `HBX` | APITUDE Activities 3.0 | `travel-service:8082` | `https://api.test.hotelbeds.com/activity-api/3.0` |
| **TRANSFERS** | `HBX` | APITUDE Transfers 1.0 | `travel-service:8082` | `https://api.test.hotelbeds.com/transfer-api/1.0` |
| **TRAINS** | `TRANSITLAND` | Transitland v2 REST | `travel-service:8082` | `https://transit.land/api/v2/rest` |

---

## 2. Transitland & ONCF Feed Specification

- **Operator OneStop ID:** `o-oncf~morocco`
- **Feed OneStop ID:** `f-oncf~morocco~rail`
- **Feed Source:** `https://github.com/newsbubbles/rail_maroc_oncf/raw/main/oncf_gtfs.zip`
- **Feed License:** Open Database License (ODbL-1.0)
- **Feed Status:** Unofficial community-maintained GTFS feed
- **Feed Validity Window:** `2024-01-01` to `2025-12-31`
- **Total Network Stations:** 33 indexed train stations across Morocco (Casa-Voyageurs, Rabat-Ville, Tanger-Ville, Marrakech, Fès, Oujda, Kenitra, etc.)
- **Service Types:**
  - `Al Boraq` (High Speed Rail / LGV Kenitra-Tanger)
  - `Al Atlas` (Intercity Mainline)
  - `TNR` (Train Navette Rapide / Regional Commuter)

---

## 3. Backend Implementation (`travel-service`)

### 3.1 Domain & Provider SPI Extensions
- [`ProviderCapability.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/ProviderCapability.java): Added `TRAINS`.
- [`TravelProduct.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/TravelProduct.java): Added `TRAINS(ProviderCapability.TRAINS)`.
- [`TravelProvider.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/TravelProvider.java): Added SPI methods:
  - `searchTrains(TrainSearchQuery query)`
  - `getTrainStations()`
- [`ProviderErrorCode.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/error/ProviderErrorCode.java): Added `SCHEDULE_DATA_OUTDATED`.
- [`GlobalExceptionHandler.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/exception/GlobalExceptionHandler.java): Maps `SCHEDULE_DATA_OUTDATED` to HTTP `422 Unprocessable Entity`.

### 3.2 Transitland Client & Provider
- [`TransitlandProperties.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/config/TransitlandProperties.java): Configured under `travel.transitland.*` with API key, base URL, feed ID, operator ID, and timeouts.
- [`TransitlandClient.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/impl/transitland/TransitlandClient.java):
  - Uses Spring 6 `RestClient`.
  - Injects `apikey` header into requests.
  - Implements typed error handling: HTTP 401/403 (`AUTHENTICATION_FAILED`), 429 (`RATE_LIMIT_EXCEEDED`), 5xx (`PROVIDER_UNAVAILABLE`), connection timeout (`TIMEOUT`).
  - Fetches feed versions, stops/stations, and departures by station.
- [`TransitlandTravelProvider.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/impl/transitland/TransitlandTravelProvider.java):
  - Station caching and normalization: deduplicates platforms and child stops into consolidated parent stations with friendly French/Arabic naming.
  - **Data Freshness Gate:** Dynamically checks requested travel date against feed `earliest_calendar_date` and `latest_calendar_date`. Throws `TravelProviderException.scheduleDataOutdated(...)` if the requested date falls outside the feed's calendar coverage.
  - Traversal matching: Queries origin departures, resolves route trip stop times, validates origin stop comes strictly before destination stop, and reconstructs intermediate stops.
  - Pricing & Provenance: Explicitly assigns `price = null`, `currency = "MAD"`, and sets `officialBookingUrl = "https://www.oncf-voyages.ma"`.

### 3.3 Endpoints & Security
- `GET /travel/trains/stations`: Returns list of available train stations.
- `POST /travel/trains/search`: Accepts `TrainSearchRequest` and returns `List<TrainOfferDto>`.
- Both endpoints are permitted public access in `SecurityConfig.java`, fronted by Gateway routing on port 8888.

---

## 4. Frontend Implementation (`frontend/web`)

### 4.1 Types & Services
- [`travel.types.ts`](file:///c:/Users/LENOVO/Desktop/Yuding/frontend/web/src/types/travel.types.ts): Defined `TrainStation`, `TrainStop`, `TrainOffer`, and `TrainSearchRequest`.
- [`travel.service.ts`](file:///c:/Users/LENOVO/Desktop/Yuding/frontend/web/src/services/travel.service.ts): Added `getTrainStations()` and `searchTrains()` routed strictly through the central `api-client.ts` via Gateway (`http://localhost:8888`).

### 4.2 UI Components
- [`StationSelector.tsx`](file:///c:/Users/LENOVO/Desktop/Yuding/frontend/web/src/components/travel/StationSelector.tsx): Accessible autocomplete with debouncing, accent-insensitive search, and keyboard navigation.
- [`TrainCard.tsx`](file:///c:/Users/LENOVO/Desktop/Yuding/frontend/web/src/components/travel/TrainCard.tsx):
  - Displays product badge (`Al Boraq`, `Al Atlas`, `TNR`).
  - Departure and arrival timings, duration, and intermediate stops expander.
  - Clearly displays *"Tarif non disponible via cette source"*.
  - Direct CTA button redirecting to official ONCF reservation portal.
- [`app/(public)/trains/page.tsx`](file:///c:/Users/LENOVO/Desktop/Yuding/frontend/web/src/app/(public)/trains/page.tsx):
  - Dedicated hero with rail imagery and badge.
  - Origin, destination, date, and passenger inputs with a station swap button.
  - **Freshness Gate Banner:** When the backend signals outdated calendar data, renders a prominent warning explaining that current timetable verification is required at `oncf-voyages.ma`.
  - Filters: Direct trains only, train type filter, sorting by departure time or duration.
  - Legal and data provenance disclosure at the bottom of the page.

---

## 5. Security & Secret Hygiene

- `TRANSITLAND_API_KEY` is loaded exclusively via environment variable or `backend/travel-service/.env.local`.
- Zero exposure in client bundles or public git commits.
- No direct service port access from browser; all calls traverse Gateway `http://localhost:8888`.
