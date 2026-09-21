# Yuding V2 — Trains Feature (ONCF GTFS Local Provider)

**Status:** COMPLETED (Supplemental Feature after Phase 25)  
**Branch:** `develop-v2`  
**Provider:** `ONCF_GTFS` — Local GTFS Dataset (`orhazal/oncf-gtfs-unofficial`)  
**Calendar Validity:** 2026-08-18 → 2028-08-18 (2-year forward window)

---

## 1. Overview & Architectural Role

The Trains feature introduces GTFS-backed timetable and route schedule search for Moroccan rail services (ONCF — Office National des Chemins de Fer) using a locally-cached, community-maintained GTFS dataset parsed entirely in-process — **no external API calls** during user search.

This feature strictly adheres to Yuding's Data Integrity and Truth-in-Advertising principles:

- **Mandatory Freshness Gate:** The GTFS calendar has a fixed service window (2026-08-18 to 2028-08-18). The server enforces an explicit date-range check. Dates outside this window return `SCHEDULE_DATA_OUTDATED` (HTTP 422) plus a redirect to [oncf-voyages.ma](https://www.oncf-voyages.ma).
- **Zero Price Invention:** GTFS data for ONCF carries no fare rules. Train offers always return `price = null` with the user-facing message *"Tarif non disponible via cette source"*.
- **Zero Fake Bookings:** Train search is informational. The "Choisir ce train" CTA is UX-only — it stores client-side selection state for Yuding's future trip planner flow. No ONCF API is called; external booking redirects to `oncf-voyages.ma`.
- **Accurate Attribution:** Data is labelled "GTFS communautaire ONCF" / `orhazal/oncf-gtfs-unofficial`, not "live", "real-time" or "official".

### Provider Topology (current)

| Vertical | Provider | Source | Capabilities |
|---|---|---|---|
| **FLIGHTS** | `SCRAPPA` | Google Flights Scraper | Flights |
| **HOTELS** | `NUITEE` | LiteAPI v3 Sandbox | Hotels |
| **ACTIVITIES** | `HBX` | APITUDE Activities 3.0 | Activities |
| **TRANSFERS** | `HBX` | APITUDE Transfers 1.0 | Transfers |
| **TRAINS** | `ONCF_GTFS` | Local GTFS (community dataset) | Trains |

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

### 3.2 New Classes

| Class | Path | Purpose |
|---|---|---|
| `OncfGtfsProperties` | `config/OncfGtfsProperties.java` | `@ConfigurationProperties(prefix="travel.oncf-gtfs")` — data path, enabled, source URL, license, official portal |
| `GtfsModels` | `provider/impl/gtfs/model/GtfsModels.java` | Inner record classes for all GTFS file rows: `GtfsAgency`, `GtfsStop`, `GtfsRoute`, `GtfsTrip`, `GtfsStopTime`, `GtfsCalendar`, `GtfsFeedInfo` |
| `OncfGtfsIndex` | `provider/impl/gtfs/OncfGtfsIndex.java` | Full GTFS parser + in-memory search index. Parses all required GTFS CSV files, builds acceleration indexes, handles GTFS >24:00 time format, weekday calendar logic, freshness gate |
| `OncfGtfsTrainProvider` | `provider/impl/gtfs/OncfGtfsTrainProvider.java` | `TravelProvider` implementation with `@PostConstruct` startup diagnostics |

### 3.3 Modified Files

| File | Change |
|---|---|
| `TravelProviderProperties.java` | Default trains provider: `"none"` → `"oncf_gtfs"` |
| `TravelProviderRegistry.java` | Added code normalization: `oncf_gtfs` → `ONCF_GTFS` (underscore/hyphen handling) |
| `TravelProviderException.java` | Added `providerUnavailable(String, String, Throwable)`, `invalidSearch()`, `badRequest()` factory methods |
| `application.properties` | Added `travel.trains.provider=oncf_gtfs`, `travel.oncf-gtfs.*` defaults |
| `.env.local` / `.env.example` | Added `TRAVEL_TRAINS_PROVIDER=oncf_gtfs`, `ONCF_GTFS_DATA_PATH`, `ONCF_GTFS_ENABLED` |

### 3.4 Configuration Properties

```properties
# application.properties
travel.trains.provider=oncf_gtfs
travel.oncf-gtfs.data-path=data/oncf-gtfs
travel.oncf-gtfs.enabled=true
travel.oncf-gtfs.source-url=https://github.com/orhazal/oncf-gtfs-unofficial
travel.oncf-gtfs.license=ODbL-1.0
travel.oncf-gtfs.official-portal-url=https://www.oncf-voyages.ma
```

### 3.5 Startup Diagnostics

On startup, the provider logs:
```
========================================================
 ONCF GTFS Train Provider Diagnostics
========================================================
 ONCF GTFS configured: YES
 Dataset loaded:       YES
 Source:               https://github.com/orhazal/oncf-gtfs-unofficial
 Valid from:           2026-08-18
 Valid until:          2028-08-18
 Stations:             115
 Routes:               64
 Trips:                354
========================================================
```

### 3.6 Tests

- **File:** `OncfGtfsTrainProviderTest.java`
- **Test count:** 8 deterministic unit tests (no network calls, offline fixture)
- **Fixture:** `src/test/resources/gtfs-test-fixture/` (6 GTFS CSV files)
- **All tests pass:** 138 total, 0 failures, 1 skipped

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
