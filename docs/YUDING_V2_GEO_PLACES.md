# Yuding V2 — Phase 26: Geo & Places Service (Geoapify)

**Status:** COMPLETED  
**Branch:** `develop-v2`  
**Primary Provider:** Geoapify API  

---

## 1. Overview & Architectural Role

Phase 26 establishes a unified, provider-neutral **Geo & Places layer** for Yuding V2. Prior to this phase, locations in several search interfaces were free-form text strings or hardcoded local lists. Phase 26 transforms locations across Yuding into structured, geocoded places with real geographic coordinates, administrative hierarchies (city, state/region, country, country code), localized points of interest (POIs), and high-resolution static map visualizers.

### Architecture & Placement
The Geo & Places capability is integrated directly into **`travel-service`** (port 8082), following Rule 2 of `AGENTS.md` (no unnecessary microservices; travel domain consolidated in `travel-service`).

All frontend client requests route through the **API Gateway** (`gateway-service`, port 8888) at `/travel/geo/**`.

### Provider Topology
| Vertical / Domain | Provider | Protocol / Engine | Port / Service | Upstream Base URL |
|---|---|---|---|---|
| **FLIGHTS** | `SCRAPPA` | Google Flights Engine | `travel-service:8082` | `https://scrappa.co/api` |
| **HOTELS** | `NUITEE` | LiteAPI v3 Sandbox | `travel-service:8082` | `https://api.liteapi.travel/v3.0` |
| **ACTIVITIES** | `HBX` | APITUDE Activities 3.0 | `travel-service:8082` | `https://api.test.hotelbeds.com/activity-api/3.0` |
| **TRANSFERS** | `HBX` | APITUDE Transfers 1.0 | `travel-service:8082` | `https://api.test.hotelbeds.com/transfer-api/1.0` |
| **TRAINS (Morocco)** | `ONCF GTFS` | In-memory GTFS Engine | `travel-service:8082` | Local GTFS feeds |
| **TRAINS (Global)** | `TRANSITOUS`| Transitous Routing API | `travel-service:8082` | `https://api.transitous.org` |
| **GEO / PLACES** | `GEOAPIFY` | Geoapify REST API | `travel-service:8082` | `https://api.geoapify.com` |

---

## 2. Capabilities & Endpoints

The service exposes five provider-neutral REST endpoints under `/travel/geo/**`:

### 1. City & Place Autocomplete
- **Endpoint:** `GET /travel/geo/autocomplete?text={query}&type={city|amenity|street}&lang={lang}&limit={limit}`
- **Purpose:** Fast debounced typeahead search returning structured places with city, state, country, ISO country code, bounding box, and coordinates.

### 2. Forward Geocoding
- **Endpoint:** `GET /travel/geo/geocode?text={addressOrName}&lang={lang}`
- **Purpose:** Resolves a landmark or address string into precise WGS-84 latitude/longitude coordinates and structured metadata.

### 3. Reverse Geocoding
- **Endpoint:** `GET /travel/geo/reverse?lat={lat}&lon={lon}&lang={lang}`
- **Purpose:** Resolves GPS coordinates into a human-readable place description and administrative hierarchy.

### 4. Nearby Points of Interest (POIs)
- **Endpoint:** `GET /travel/geo/places/nearby?lat={lat}&lon={lon}&categories={cats}&radius={meters}&limit={limit}`
- **Categories Supported:** `attractions`, `museums`, `restaurants`, `cafes`, `parks`, `shopping`, `transport`.
- **Purpose:** Discovers nearby attractions and amenities around hotels, activities, or selected destinations, computed with haversine distance in meters.

### 5. Static Map Visualizer (Backend Proxy)
- **Endpoint:** `GET /travel/geo/map/static?lat={lat}&lon={lon}&zoom={zoom}&width={width}&height={height}&markerLat={mLat}&markerLon={mLon}`
- **Response:** `image/png` binary stream.
- **Purpose:** Proxies and signs static map tiles from Geoapify so the client never interacts with or discovers third-party provider keys.

---

## 3. Provider Abstraction & Design

The subsystem strictly adheres to the provider-neutral abstraction pattern:

- **Interface:** `com.ahmed.travelservice.provider.geo.GeoProvider`
  - Defines `autocomplete(...)`, `geocode(...)`, `reverseGeocode(...)`, `getNearbyPlaces(...)`, and `getStaticMap(...)`.
- **Implementation:** `com.ahmed.travelservice.provider.impl.geoapify.GeoapifyGeoProvider`
  - Encapsulates Geoapify-specific endpoint paths, category translations (e.g., `attractions` $\to$ `entertainment.culture,tourism.sights`), and coordinate parameter formatting.
- **HTTP Client:** `com.ahmed.travelservice.provider.impl.geoapify.GeoapifyClient`
  - Built with Spring Framework 6 `RestClient` with timeout controls (connect: 5s, read: 10s).
  - Handles rate limits (`429 Too Many Requests`), authorization errors (`401 Unauthorized`), and upstream provider exceptions cleanly.
- **Service Layer:** `com.ahmed.travelservice.service.TravelGeoService`
  - Validates coordinate bounds ($-90 \le \text{lat} \le 90$, $-180 \le \text{lon} \le 180$), radius clamps ($100\text{m} \le r \le 50\,000\text{m}$), and limit clamps ($1 \le n \le 50$).

---

## 4. Frontend Components & User Experience

Located in `frontend/web/src/components/travel/`:

1. **`GeoPlaceSelector.tsx`**:
   - Accessible WAI-ARIA combobox with keyboard navigation (ArrowUp, ArrowDown, Enter, Escape).
   - 300ms debounce with minimum 2-character trigger threshold.
   - Distinct icons for cities, airports, and points of interest.
   - Quick "Clear" action and loading spinner.
   - Direct integration into:
     - **Hotels Page (`/hotels`)**: Auto-fills structured city name and ISO country code directly for Nuitee LiteAPI v3 search. Includes an interactive Destination Guide with map and POIs upon selection.
     - **Activities Page (`/activities`)**: Passes structured destination to HBX APITUDE Activities. Includes an interactive Destination Guide with map and POIs upon selection.
     - **Transfers Page (`/transfers`)**: Enhanced `TransferLocationSelector` searches both HBX popular hubs and global Geoapify places with coordinate resolution.
     - **Homepage Hero (`/`)**: Destination combobox feeding directly into search flows.

2. **`GeoMap.tsx`**:
   - Renders backend-proxied static maps with interactive zoom controls (`+` / `-`).
   - Clean non-color marker coordinates (`lonlat:lon,lat`).
   - Supports POI markers with pin styling.
   - Displays compliant attribution: **Powered by Geoapify | © OpenStreetMap contributors**.

3. **`NearbyPoiPanel.tsx`**:
   - Filter tabs: Attractions, Museums, Restaurants, Cafés, Parks, Shopping, Transport.
   - Place cards with name, address, distance (in meters or kilometers), and "View on Map" focus trigger.

---

## 5. Security Model & API Key Isolation

- **Zero Client Exposure:** `GEOAPIFY_API_KEY` is loaded strictly in `backend/travel-service` via environment variable or `.env.local`. It is never delivered to the browser or embedded in client JS bundles.
- **Gateway Boundary:** All frontend calls route to `/travel/geo/**` via the Gateway (port 8888). Direct calls to port 8082 are prevented by architectural convention.
- **No Secret Logging:** `GeoapifyClient` and `GeoapifyProperties` do not print keys to logs. Application startup prints diagnostic verification: `[DIAGNOSTIC] Geoapify configured: YES` with zero key characters.
- **Defense in Depth:** Spring Security configuration in `travel-service` explicitly allows read-only public access to `/travel/geo/**` alongside existing public catalog endpoints.

---

## 6. Testing & Quota Safeguards

- **Geoapify Evaluation Quota:** 3,000 credits/day on the free tier.
- **Automated Tests:**
  - Backend: `GeoapifyClientTest` uses `MockRestServiceServer` to test autocomplete, geocode, reverse geocode, nearby places, static map proxying, HTTP 401, HTTP 429, and HTTP 500 without consuming a single live credit.
  - MockMvc: `TravelGeoControllerTest` verifies REST endpoints, DTO serialization, and input validation.
  - Frontend: `geo-places.test.ts` tests mock API interactions and component contracts with Vitest.
  - All automated test suites execute with zero live network calls.
