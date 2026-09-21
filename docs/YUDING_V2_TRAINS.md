# Yuding V2 — Trains Feature (ONCF GTFS Local + Transitous Global)

**Status:** COMPLETED (Global Rail Extension after Phase 25)  
**Branch:** `develop-v2`  
**Domestic Morocco Provider:** `ONCF_GTFS` — Local GTFS Dataset (`orhazal/oncf-gtfs-unofficial`)  
**Global / International Provider:** `TRANSITOUS` — Public MOTIS v2 Journey Planner (`api.transitous.org`)  
**Calendar Validity (Morocco):** 2026-08-18 → 2028-08-18 (2-year forward window)  
**Global Coverage:** Worldwide open transit feeds (Europe, North America, Japan, etc.)

---

## 1. Overview & Architectural Role

The Trains vertical provides a unified train schedule and journey search experience across two integrated provider tiers managed seamlessly by `TrainRoutingService`:

1. **Morocco Tier (`ONCF_GTFS`):** Local GTFS dataset parsed in-memory for Moroccan domestic rail services (Al Boraq high-speed, Al Atlas intercity, TNR commuter). Zero network overhead and deterministic reliability.
2. **Global Tier (`TRANSITOUS`):** Public Transitous MOTIS v2 engine providing intercity, regional, and international rail journeys worldwide with multi-leg transfer support.

```
TRAINS SEARCH (POST /travel/trains/search)
                  │
        TrainRoutingService
                  ├── isMoroccanDomestic(origin, destination)?
                  │       ├── YES ──► OncfGtfsTrainProvider (Local GTFS)
                  │       │            └── (fallback to Transitous if unserved)
                  │       └── NO  ──► TransitousTrainProvider (MOTIS v2)
                  │
STATIONS AUTOCOMPLETE (GET /travel/trains/stations?query=...)
                  │
        TrainRoutingService
                  ├── ONCF GTFS stations (indexed locally)
                  └── Transitous Geocoding API (/v1/geocode)
                  (merged and deduplicated)
```

This feature strictly adheres to Yuding's Data Integrity and Truth-in-Advertising principles:

- **Mandatory Freshness Gate (Morocco):** The ONCF GTFS calendar has a fixed service window (2026-08-18 to 2028-08-18). Dates outside this window return `SCHEDULE_DATA_OUTDATED` (HTTP 422) plus an official redirect link to [oncf-voyages.ma](https://www.oncf-voyages.ma).
- **Truth-in-Advertising Fares:** Transitous and ONCF GTFS do not publish ticketing fare tables. Train offers strictly return `price = null` with the UI displaying *"Tarif non disponible via cette source"* — zero artificial or 0-euro prices are ever displayed.
- **Zero Fake Bookings:** Train search is informational. The "Choisir ce train" CTA is UX-only — it stores client-side selection state for Yuding's future trip planner flow. External official booking redirects to carrier portals (e.g. `oncf-voyages.ma`, `transitous.org`).
- **Compliant Attribution & Headers:** Transitous calls include the required `User-Agent: Yuding/2.0 (https://ahmedelbattah.vercel.app)`. UI prominently attributes both datasets: GTFS communautaire ONCF and Transitous Open Transit Data.

### Provider Topology (current)

| Vertical | Provider | Source | Capabilities |
|---|---|---|---|
| **FLIGHTS** | `SCRAPPA` | Google Flights Scraper | Flights |
| **HOTELS** | `NUITEE` | LiteAPI v3 Sandbox | Hotels |
| **ACTIVITIES** | `HBX` | APITUDE Activities 3.0 | Activities |
| **TRANSFERS** | `HBX` | APITUDE Transfers 1.0 | Transfers |
| **TRAINS (Morocco)** | `ONCF_GTFS` | Local GTFS (community dataset) | Trains (Morocco) |
| **TRAINS (Global)** | `TRANSITOUS` | Transitous Public MOTIS v2 API | Trains & Rail Journeys (Global) |

---

## 2. GTFS Dataset Specification

| Property | Value |
|---|---|
| Repository | [orhazal/oncf-gtfs-unofficial](https://github.com/orhazal/oncf-gtfs-unofficial) |
| Download URL | `https://raw.githubusercontent.com/orhazal/oncf-gtfs-unofficial/master/oncf-gtfs.zip` |
| License | Open Database License (ODbL-1.0) |
| Feed Version | `2026-08-18` (last commit: `2026-08-17T23:41:42Z`) |
| Calendar valid | 2026-08-18 → 2028-08-18 |
| Stations | 217 stops total / 115 parent stations |
| Routes | 64 routes |
| Trips | 354 trips |
| Service types | Al Boraq (TGV), Al Atlas (Intercity), TNR (Regional Commuter) |
| No `calendar_dates.txt` | Confirmed (only weekday-based calendar) |
| Local path | `backend/travel-service/data/oncf-gtfs/` (git-ignored — download via script) |

---

## 3. Backend Implementation

### 3.1 Domain & Provider SPI Extensions

Previously added (Phase before Trains):
- `ProviderCapability.TRAINS`
- `TravelProduct.TRAINS`
- `TravelProvider.searchTrains()` / `TravelProvider.getTrainStations()` (default methods)
- `TrainSearchRequest`, `TrainSearchResponse`, `TrainOffer`, `TrainStation`, `TrainStopDetail` (domain types)

### 3.2 Key Classes

| Class | Path | Purpose |
|---|---|---|
| `OncfGtfsProperties` | `config/OncfGtfsProperties.java` | `@ConfigurationProperties(prefix="travel.oncf-gtfs")` — data path, enabled, source URL, license, official portal |
| `TransitousProperties` | `config/TransitousProperties.java` | `@ConfigurationProperties(prefix="travel.transitous")` — base URL, user agent, timeout, language |
| `GtfsModels` | `provider/impl/gtfs/model/GtfsModels.java` | Inner record classes for all GTFS file rows: `GtfsAgency`, `GtfsStop`, `GtfsRoute`, `GtfsTrip`, `GtfsStopTime`, `GtfsCalendar`, `GtfsFeedInfo` |
| `OncfGtfsIndex` | `provider/impl/gtfs/OncfGtfsIndex.java` | Full GTFS parser + in-memory search index with date freshness gate |
| `OncfGtfsTrainProvider` | `provider/impl/gtfs/OncfGtfsTrainProvider.java` | `TravelProvider` implementation for Moroccan GTFS schedules |
| `TransitousModels` | `provider/impl/transitous/model/TransitousModels.java` | Geocode and MOTIS v2 Plan DTOs (`PlanResponse`, `Itinerary`, `Leg`, `StopPlace`) |
| `TransitousClient` | `provider/impl/transitous/client/TransitousClient.java` | Spring RestClient with custom User-Agent, `/v1/geocode` and `/v6/plan` |
| `TransitousTrainProvider` | `provider/impl/transitous/TransitousTrainProvider.java` | Global `TravelProvider` mapping Transitous itineraries and multi-leg transfers |
| `TrainRoutingService` | `service/TrainRoutingService.java` | Coordinates domestic Moroccan routing vs global Transitous journeys, merges stations |

### 3.3 Configuration Properties

```properties
# application.properties
# Moroccan Domestic GTFS
travel.trains.provider=oncf_gtfs
travel.oncf-gtfs.data-path=data/oncf-gtfs
travel.oncf-gtfs.enabled=true
travel.oncf-gtfs.source-url=https://github.com/orhazal/oncf-gtfs-unofficial
travel.oncf-gtfs.license=ODbL-1.0
travel.oncf-gtfs.official-portal-url=https://www.oncf-voyages.ma

# Global Transitous (MOTIS v2)
travel.providers.global-trains=transitous
travel.transitous.base-url=https://api.transitous.org/api
travel.transitous.user-agent=Yuding/2.0 (https://ahmedelbattah.vercel.app)
travel.transitous.connect-timeout-ms=5000
travel.transitous.read-timeout-ms=15000
travel.transitous.lang=en
```

### 3.4 Automated Tests

- **TransitousClientTest:** 5 deterministic unit tests via `MockRestServiceServer` (no live network, headers validated).
- **TransitousTrainProviderTest:** 4 unit tests verifying itineraries, transfers, error handling, null price policy.
- **TrainRoutingServiceTest:** 4 unit tests verifying Moroccan vs international route dispatch and deduplication.
- **OncfGtfsTrainProviderTest:** 9 deterministic unit tests with offline GTFS fixture.
- **Frontend Service & Model Tests:** 5 unit tests in `trains-search.test.ts` verifying stations query, search payloads, error states, and multi-leg journey handling.
- **Full Backend Suite:** 151 passed, 0 failures, 0 errors.
- **Full Frontend Suite:** 55 passed, 0 failures.

---

## 4. Frontend Implementation

### 4.1 Pages & Components

| File | Change |
|---|---|
| `src/app/(public)/trains/page.tsx` | Date picker `min=today`, defaults to today, attribution updated |
| `src/components/travel/TrainCard.tsx` | "Choisir ce train" CTA, "GTFS communautaire ONCF" badge, "Réserver sur ONCF" external link |
| `src/components/travel/StationSelector.tsx` | Station autocomplete (unchanged) |

### 4.2 UX Flows

**Happy path (today or future date, valid route):**
1. User selects gare de départ + gare d'arrivée + date (min = today)
2. Optional: choose "À partir de" time filter
3. Click "Rechercher" → POST `/travel/trains/search` via Gateway
4. Results show as `TrainCard` list (sorted by departure)
5. Each card: product type badge, train number, departure/arrival time, duration, "GTFS communautaire ONCF" source badge
6. "Choisir ce train" CTA toggles to "Train sélectionné" (local state — future booking flow hook)
7. "Réserver sur ONCF" links to `oncf-voyages.ma`

**Outdated date path:**
- Backend returns HTTP 422 with `SCHEDULE_DATA_OUTDATED`
- Frontend shows amber alert: calendar gate explanation + ONCF redirect button

**Provider unavailable:**
- Backend returns `PROVIDER_UNAVAILABLE` status
- Frontend shows grey notice + ONCF link

### 4.3 Source Attribution

Footer correctly reads:
> "Données d'horaires ferroviaires issues du jeu de données GTFS communautaire ONCF ([orhazal/oncf-gtfs-unofficial](https://github.com/orhazal/oncf-gtfs-unofficial), Licence ODbL 1.0) — source non officielle, mise à jour périodiquement."

**No Transitland branding** — Transitland is not used as the data source.

---

## 5. Operational Scripts

| Script | Purpose |
|---|---|
| `scripts/update-oncf-gtfs.ps1` | Downloads/updates ONCF GTFS dataset from GitHub. Run periodically (e.g., monthly) to refresh calendar data |
| `scripts/start-dev.ps1` | Auto-checks GTFS dataset presence on startup; runs update script if dataset is missing |
| `backend/travel-service/start-travel.ps1` | Loads `.env.local` and starts travel-service with correct env vars |

### Update Dataset
```powershell
cd C:\Users\LENOVO\Desktop\Yuding
.\scripts\update-oncf-gtfs.ps1
```

---

## 6. API Specification

### Search Trains
```
POST /travel/trains/search   (via Gateway :8888)
Authorization: Bearer <token>  OR  anonymous (public endpoint)
```

**Request:**
```json
{
  "originStation": "Casa-Voyageurs",
  "destinationStation": "Tanger-Ville",
  "date": "2026-09-22",
  "departureTime": "08:00",   // optional — filter from this time
  "currency": "MAD"
}
```

**Response (SUCCESS):**
```json
{
  "status": "SUCCESS",
  "searchId": "uuid",
  "results": [
    {
      "offerId": "uuid",
      "provider": "ONCF_GTFS",
      "source": "ONCF_GTFS_LOCAL",
      "productType": "Al Boraq",
      "trainNumber": "7001",
      "operator": "ONCF",
      "originStation": "Casa-Voyageurs",
      "destinationStation": "Tanger-Ville",
      "departureTime": "06:10",
      "arrivalTime": "08:10",
      "durationMinutes": 120,
      "direct": true,
      "stopsCount": 0,
      "price": null,
      "currency": "MAD",
      "officialScheduleUrl": "https://www.oncf-voyages.ma",
      "intermediateStops": []
    }
  ],
  "providerCode": "ONCF_GTFS",
  "message": null
}
```

### Get Train Stations
```
GET /travel/trains/stations   (via Gateway :8888)
```

**Response:** Array of `{ "id": "Casa-Voyageurs", "name": "Casa-Voyageurs", "country": "MA", ... }`

---

## 7. Live Validation Results

Confirmed live results via Gateway (2026-09-21):

| Search | Date | Result |
|---|---|---|
| Casa-Voyageurs → Tanger-Ville | 2026-09-22 (Tuesday) | ✅ 16 trains |
| Gateway status | — | ✅ `SUCCESS` |
| Backend startup | — | ✅ 25.4s boot, GTFS loaded |
| TypeScript check | — | ✅ 0 errors |
| Next.js build | — | ✅ 21 pages, 0 errors |
| Backend tests | — | ✅ 138/138, 0 failures |

---

## 8. Data Freshness & Maintenance

The ONCF GTFS dataset must be refreshed periodically:
- **Current validity:** 2026-08-18 → 2028-08-18 (2 years)
- **Recommended refresh:** Monthly, or when ONCF announces timetable changes
- **Alert threshold:** If current date > dataset `feed_end_date - 30 days`, log a WARNING at startup

Run `scripts/update-oncf-gtfs.ps1` to refresh. The dataset file is git-ignored (only `.gitkeep` is committed to preserve the directory).
