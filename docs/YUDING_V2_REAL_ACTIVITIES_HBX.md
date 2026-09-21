# Yuding V2 — Phase 24: Real Activities via HBX Group / Hotelbeds APITUDE

**Status:** COMPLETED  
**Branch:** `develop-v2`  
**Provider Suite:** HBX Group (Hotelbeds APITUDE Activities v3.0)  

---

## 1. Overview & Architectural Role

Phase 24 introduces provider-backed search and availability for activities and experiences in Yuding V2 using the official HBX Group (Hotelbeds) APITUDE Activities evaluation API (`activity-api/3.0`).

### Provider Topology
| Vertical | Provider | Protocol / Version | Port / Service | Base URL |
|---|---|---|---|---|
| **FLIGHTS** | `SCRAPPA` | Google Flights Scraper | `travel-service:8082` | `https://scrappa.co/api` |
| **HOTELS** | `NUITEE` | LiteAPI v3 Sandbox | `travel-service:8082` | `https://api.liteapi.travel/v3.0` |
| **ACTIVITIES** | `HBX` | APITUDE Activities 3.0 | `travel-service:8082` | `https://api.test.hotelbeds.com/activity-api/3.0` |
| **TRANSFERS** | `HBX` | APITUDE Transfers 1.0 | `travel-service:8082` | `https://api.test.hotelbeds.com/transfer-api/1.0` |

*Note: Hotels remain on Nuitee Connect and Flights remain on Scrappa. Zero cross-migration.*

---

## 2. HBX Authentication & Security Model

HBX evaluation endpoints require dynamic header authentication on every outbound request:
- `Api-key`: Stored securely in `backend/travel-service/.env.local` as `HBX_ACTIVITIES_API_KEY`.
- `X-Signature`: SHA-256 hex digest computed as:
  $$\text{X-Signature} = \text{Hex}(\text{SHA-256}(\text{apiKey} + \text{secret} + \lfloor\text{System.currentTimeMillis}() / 1000\rfloor))$$

Implemented in:
[`com.ahmed.travelservice.provider.impl.hbx.HBXAuthUtils`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/impl/hbx/HBXAuthUtils.java)

### Security Rules
- **No Client Exposure:** The browser never touches `HBX_*_API_KEY`, `HBX_*_SECRET`, or `X-Signature`. All HBX calls occur strictly within `travel-service` backend behind the Gateway (port 8888).
- **No Secret Logging:** Keys and secrets are never printed to console or logs; diagnostics only log `configured` or `missing`.
- **Zero Real Transactions:** Yuding is a portfolio/personal platform. Integration is strictly limited to search and availability queries (`POST /activities`). No purchase, confirmation, or real booking endpoints are invoked.

---

## 3. Backend Implementation

1. **Configuration:**
   - [`HBXProperties.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/config/HBXProperties.java): Spring `@ConfigurationProperties(prefix = "travel.providers.hbx")` mapping credentials and base URLs.
2. **DTOs:**
   - [`HBXActivitySearchRequest.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/impl/hbx/dto/activities/HBXActivitySearchRequest.java): Destination filter model targeting HBX `/activities`.
   - [`HBXActivitySearchResponse.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/impl/hbx/dto/activities/HBXActivitySearchResponse.java): Response parser for activities, modalities, pricing, and media.
   - [`ActivityOfferDto.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/dto/response/ActivityOfferDto.java): Added `source` provenance field (`HBX` vs `YUDING_CUSTOM`).
3. **Client (`HBXActivitiesClient`):**
   - Resolves Moroccan destinations to HBX destination codes (e.g. Marrakech $\to$ `RAK`, Casablanca $\to$ `CAS`, Agadir $\to$ `AGA`, Fes $\to$ `FEZ`, Tangier $\to$ `TNG`, Rabat $\to$ `RBA`).
   - Executes `POST /activities` with standard headers and filters.
   - Gracefully handles HTTP 403, 429, timeouts, and network issues by remapping to `TravelProviderException`.
4. **Provider Adapter (`HBXTravelProvider`):**
   - Implements `searchActivities(ActivitySearchRequest)`.
   - Normalizes HBX activity modalities, pricing, currency, duration, and images into `ActivityOfferDto`.
   - Tags each offer with `source: "HBX"`.
   - In case HBX returns no availability for a specific regional search, provides curated `YUDING_CUSTOM` offers marked explicitly with `source: "YUDING_CUSTOM"` to ensure transparency.

---

## 4. Frontend Experience (`frontend/web/src/app/(public)/activities/page.tsx`)

- Clean initial state explaining what travelers can search.
- Interactive destination, date, travelers, and category filters.
- Clear partner provenance badges: `Partenaire HBX` (emerald badge) for live HBX offers vs `Yuding Sélect` for curated offers.
- No dummy or fake un-attributed data.
- Responsive grid, modal detail preview, and booking redirect button.

---

## 5. Verification & Quota Safeguards

- **HBX Daily Quota:** 50 requests/day in evaluation environment.
- **Unit & Mock Tests:** Zero live HBX calls consumed during testing:
  - `HBXAuthUtilsTest`: Tests signature generation against reference SHA-256 vectors.
  - `HBXActivitiesClientTest`: Tests HTTP contract and error remapping with `MockWebServer`.
  - `HBXTravelProviderTest`: Tests normalization and source provenance with Mockito.
