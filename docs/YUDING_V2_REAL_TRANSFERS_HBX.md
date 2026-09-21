# Yuding V2 — Phase 25: Real Transfers via HBX Group / Hotelbeds APITUDE

**Status:** COMPLETED  
**Branch:** `develop-v2`  
**Provider Suite:** HBX Group (Hotelbeds APITUDE Transfers v1.0)  

---

## 1. Overview & Architectural Role

Phase 25 introduces provider-backed search and availability for airport and inter-city transfers in Yuding V2 using the official HBX Group (Hotelbeds) APITUDE Transfers evaluation API (`transfer-api/1.0`).

### Provider Topology
| Vertical | Provider | Protocol / Version | Port / Service | Base URL |
|---|---|---|---|---|
| **FLIGHTS** | `SCRAPPA` | Google Flights Scraper | `travel-service:8082` | `https://scrappa.co/api` |
| **HOTELS** | `NUITEE` | LiteAPI v3 Sandbox | `travel-service:8082` | `https://api.liteapi.travel/v3.0` |
| **ACTIVITIES** | `HBX` | APITUDE Activities 3.0 | `travel-service:8082` | `https://api.test.hotelbeds.com/activity-api/3.0` |
| **TRANSFERS** | `HBX` | APITUDE Transfers 1.0 | `travel-service:8082` | `https://api.test.hotelbeds.com/transfer-api/1.0` |

*Note: Hotels remain on Nuitee Connect and Flights remain on Scrappa. Zero cross-migration.*

---

## 2. HBX Transfers API Contract & Authentication

HBX Transfers v1.0 uses a path-parameter REST endpoint with header-based SHA-256 authentication.

### Endpoint Contract
```http
GET /availability/{lang}/from/{fromType}/{fromCode}/to/{toType}/{toCode}/{outbound}/{adults}/{children}/{infants}
```

- `lang`: e.g. `fr` or `en`
- `fromType` / `toType`: `IATA` for airports (e.g. `RAK`, `CMN`), `ATLAS` for destination/hotel codes, or `GPS` (`latitude,longitude` formatted to 3+ decimals)
- `outbound`: ISO-8601 date-time e.g. `2026-10-15T12:00:00`
- `adults` / `children` / `infants`: passenger breakdown integers

### Dynamic Authentication Headers
- `Api-key`: Stored in `backend/travel-service/.env.local` as `HBX_TRANSFERS_API_KEY`.
- `X-Signature`: SHA-256 hex digest:
  $$\text{X-Signature} = \text{Hex}(\text{SHA-256}(\text{apiKey} + \text{secret} + \lfloor\text{System.currentTimeMillis}() / 1000\rfloor))$$

---

## 3. Backend Implementation

1. **Configuration:**
   - [`HBXProperties.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/config/HBXProperties.java): Properties mapped under `travel.providers.hbx.transfers.*`.
2. **DTOs:**
   - [`HBXTransferAvailabilityResponse.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/provider/impl/hbx/dto/transfers/HBXTransferAvailabilityResponse.java): Response model mapping services, vehicles, categories, pricing, currency, and cancellation policies.
   - [`TransferOfferDto.java`](file:///c:/Users/LENOVO/Desktop/Yuding/backend/travel-service/src/main/java/com/ahmed/travelservice/dto/response/TransferOfferDto.java): Standardized transfer offer with source provenance, vehicle category, passenger/luggage capacities, pickup, and dropoff.
3. **Client (`HBXTransfersClient`):**
   - Resolves locations dynamically and globally:
     - Accepts explicit provider location prefixes (`IATA:`, `ATLAS:`, `GPS:`, `PORT:`, `STATION:`).
     - Accepts raw GPS coordinates (`lat,long`).
     - Accepts arbitrary 3-letter IATA airport codes (`CDG`, `BCN`, `MAD`, `RAK`, `JFK`, etc.).
     - Performs dynamic lookup against `AirportDirectory`.
     - Derives destination GPS coordinates dynamically from the origin airport without static regional maps.
   - Formats outbound date-time `YYYY-MM-DDTHH:mm:00`.
   - Dispatches authenticated GET request with error remapping to `TravelProviderException`.
4. **Provider Adapter (`HBXTravelProvider`):**
   - Implements `searchTransfers(TransferSearchRequest)`.
   - Maps HBX vehicle categories (`STANDARD`, `MINIVAN`, `EXECUTIVE`, `SHUTTLE`) to Yuding transfer types.
   - Populates `source: "HBX"`.
   - In case HBX returns no availability, returns a clean empty list `[]` without fabricating fake transfer services.

---

## 4. Frontend Experience (`frontend/web/src/app/(public)/transfers/page.tsx`)

- Clean initial search state with helpful guidance on Moroccan hubs (Marrakech Menara, Casablanca Mohammed V, Agadir, etc.).
- Pickup, dropoff, date, time, passengers, and transfer type selectors.
- Distinct badges for `Transfert Privé` vs `Navette Partagée`.
- Provenance indicator badge: `Partenaire HBX` for live HBX offers vs `Yuding Sélect` for curated offers.
- Vehicle specifications (passenger seats, luggage count, air conditioning, driver meeting).

---

## 5. Verification & Quota Safeguards

- **HBX Daily Quota:** 50 requests/day in evaluation environment.
- **Unit & Mock Tests:** Zero live HBX calls consumed during testing:
  - `HBXTransfersClientTest`: Tests URL assembly, coordinate handling, and response deserialization with `MockWebServer`.
  - `HBXTravelProviderTest`: Tests transfer normalization, fallback, and provenance with Mockito.
