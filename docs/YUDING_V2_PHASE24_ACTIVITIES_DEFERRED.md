# Yuding V2 — Phase 24: Activities Provider Integration (DEFERRED)

**Status:** DEFERRED / FROZEN — NOT COMPLETE  
**Branch:** `develop-v2`  
**Revisit Checkpoint:** Prior to commencing Phase 31  

---

## 1. Executive Summary & Freeze Decision

Phase 24 of the Yuding V2 roadmap was planned to integrate an external provider for live activities, tours, and excursions.

Following direct provider investigation and evaluation of onboarding timelines, live external provider integration for Activities is **DEFERRED / FROZEN until Phase 31**.

Work on the Yuding V2 roadmap proceeds immediately with **Phase 25 (Transfers)** and subsequent phases (Phase 26 through Phase 30). Before starting implementation of Phase 31, Phase 24 will be formally revisited at a mandatory checkpoint.

---

## 2. Investigated Provider Candidates & Status

During the evaluation phase for Activities in Morocco and international destinations, four potential providers were analyzed:

1. **Viator (TripAdvisor Company):**
   - *Status:* Onboarding / business verification pending.
   - *Assessment:* Excellent Morocco inventory and coverage; integration paused pending partner verification approval.
2. **Tiqets:**
   - *Status:* Partner application submitted; awaiting platform approval.
   - *Assessment:* Strong ticketing inventory for cultural attractions and monuments.
3. **Rezdy:**
   - *Status:* Channel manager / operator marketplace; API access requires onboarding wait times.
   - *Assessment:* Good B2B tour operator connectivity; deferred pending API credentials.
4. **Nuitee Experiences:**
   - *Status:* Sandbox account tested; returned `HTTP 403 Forbidden` (`experiences_access` capability not activated on the provisioned sandbox account).
   - *Assessment:* Hotel rates active via LiteAPI v3, but experiential endpoints require separate commercial entitlement.

To maintain rapid development momentum and adhere to our strict zero-fake-data policy, we deliberately avoid custom scraping or unverified mock implementations.

---

## 3. Current Provider Configuration

In accordance with the Phase 21 Travel Provider Abstraction architecture, provider bindings remain strictly enforced across all microservices:

| Travel Domain | Active Provider | Status | Port / Service |
|---|---|---|---|
| **FLIGHTS** | `SCRAPPA` | Active / Real Google Flights | `travel-service:8082` |
| **HOTELS** | `NUITEE` | Active / LiteAPI v3 Sandbox | `travel-service:8082` |
| **ACTIVITIES** | `NONE` | **DEFERRED / Unavailable** | `travel-service:8082` |
| **TRANSFERS** | `NONE` | Scheduled for Phase 25 | `travel-service:8082` |

In `backend/travel-service/src/main/resources/application.properties`:
```properties
travel.providers.flights=${TRAVEL_FLIGHTS_PROVIDER:none}
travel.providers.hotels=${TRAVEL_HOTELS_PROVIDER:none}
travel.providers.activities=${TRAVEL_ACTIVITIES_PROVIDER:none}
travel.providers.transfers=${TRAVEL_TRANSFERS_PROVIDER:none}
```

When `travel.providers.activities=none`, `TravelProviderRegistry` resolves to `NoConfiguredTravelProvider`, which returns a standardized `PROVIDER_UNAVAILABLE` response with an empty results array (`[]`) and count `0`.

---

## 4. Zero Fake / Seeded Live Activities Policy

Yuding V2 maintains a strict policy regarding data provenance:
- **No Seeded Data as Live Offers:** Database records or seeded fixtures must NEVER be presented to users as real live provider offers.
- **No Static Demo Arrays:** Frontend pages must not hardcode demo pricing or fake bookable activities.
- **No Fabricated Availability:** No mock prices, synthetic booking references, or fake availability slots.

### Frontend Behavior
- The `/activities` route in `frontend/web/src/app/(public)/activities/page.tsx` is preserved.
- When `travelService.searchActivities()` returns `PROVIDER_UNAVAILABLE` (empty results), the page displays a clean, user-friendly state:
  > **"Aucune activité disponible pour le moment"**  
  > *"Les activités seront bientôt disponibles."*
- Legacy visual assets in `frontend/reservation/` remain preserved untouched for historical reference.

---

## 5. Intended Future Strategy (Phase 31 Revisit)

When Phase 24 is revisited before Phase 31, the architecture will follow a hybrid model to ensure comprehensive coverage of both Moroccan regional excursions and global activities:

### 1. Primary External Provider
- Integrate an approved enterprise provider (Viator, Tiqets, Rezdy, or activated Nuitee Experiences).
- Fetches real-time pricing, availability schedules, and instant booking confirmations.

### 2. Optional `YUDING_CUSTOM` Fallback
- If external provider coverage in specific Moroccan regions (e.g. desert treks in Merzouga, guided medina tours in Fes) is thin or lacking API connectivity:
  - Curated direct contracts managed via `YUDING_CUSTOM`.
  - Stored within the `travel.activities` schema with verified operator metadata.

### 3. Explicit Source Provenance
Every activity offer returned by `travel-service` will mandate an explicit `source` discriminator:
- `EXTERNAL_PROVIDER` (e.g. `VIATOR`, `TIQETS`, `NUITEE`)
- `YUDING_CUSTOM` (direct verified operator partner)

Zero ambiguity between third-party provider rates and curated local inventory.

---

## 6. Roadmap Sequence & Revisit Checkpoint

```
Phase 22: Real Flights (Scrappa)                 [COMPLETE]
Phase 23: Real Hotels (Nuitee Connect)           [COMPLETE]
Phase 24: Activities Provider Integration        [DEFERRED / FROZEN]
   │
   ├─► Phase 25: Transfers Provider Integration
   ├─► Phase 26: Search & Filter UX Consolidation
   ├─► Phase 27: Unified Booking & Reservation Flow
   ├─► Phase 28: Payment Provider Abstraction
   ├─► Phase 29: AI RAG & Context Integration
   ├─► Phase 30: End-to-End Hardening & Observability
   │
   ▼
[MANDATORY CHECKPOINT: REVISIT PHASE 24 ACTIVITIES]
   │
   └─► Phase 31: Production Deployment & Dockerization
```

### Future Dependencies Handling
Future development phases that touch activity domain features (e.g. unified search, offer details, AI tool `searchActivities`, smart trip planner) must treat Activities as:
- **`PROVIDER_UNAVAILABLE` / `DEFERRED`**
- Return zero fake offers or prices.
- Gracefully indicate that activity booking is coming soon without throwing unexpected errors.
