# Yuding V2 — Phase 24: Activities Provider Integration (HBX Group / Hotelbeds)

**Status:** RESUMED / PENDING IMPLEMENTATION  
**Branch:** `develop-v2`  
**Provider Suite:** HBX Group (Hotelbeds APITUDE Activities)  

---

## 1. Executive Summary & Resumption

Phase 24 of the Yuding V2 roadmap was initially deferred pending partner onboarding across legacy candidates.

With the selection of the **HBX Group (Hotelbeds APITUDE)** API suite for both Activities and Transfers, Phase 24 is **OFFICIALLY RESUMED** in status `PENDING IMPLEMENTATION`.

Work on Phase 24 will implement provider-backed search and availability for activities and experiences using the official evaluation endpoints.

---

## 2. Selected Provider & Architectural Alignment

| Travel Domain | Active / Target Provider | Status | Port / Service | Evaluation Base URL |
|---|---|---|---|---|
| **FLIGHTS** | `SCRAPPA` | Active / Real Google Flights | `travel-service:8082` | `https://scrappa.co/api` |
| **HOTELS** | `NUITEE` | Active / LiteAPI v3 Sandbox | `travel-service:8082` | `https://api.liteapi.travel/v3.0` |
| **ACTIVITIES** | `HBX` | **Resumed / Pending Implementation** | `travel-service:8082` | `https://api.test.hotelbeds.com/activity-api/3.0` |
| **TRANSFERS** | `HBX` | **Target Architecture (Phase 25)** | `travel-service:8082` | `https://api.test.hotelbeds.com/transfer-api/1.0` |

> **IMPORTANT — Provider Isolation:**
> Hotels are fully operational via Nuitee Connect / LiteAPI v3. Hotels MUST NOT be migrated to HBX.
> Flights are fully operational via Scrappa. Flights MUST NOT be migrated from Scrappa.

---

## 3. HBX Authentication & Security Model

HBX evaluation endpoints utilize dynamic header-based authentication:
- `Api-key`: Provider API key.
- `X-Signature`: Hex-encoded SHA-256 hash computed on the server side:
  $$\text{X-Signature} = \text{SHA-256}(\text{API\_KEY} + \text{SECRET} + \text{TIMESTAMP\_IN\_SECONDS})$$

### Security & Privacy Rules
- **No Secrets in Frontend:** The browser never receives or generates `Api-key` or `X-Signature`. All communication with HBX occurs strictly server-side within `travel-service`.
- **No Secrets in Version Control:** Credentials reside exclusively in the Git-ignored `backend/travel-service/.env.local`.
- **No Secret Logging:** `TravelServiceApplication` and backend logs must never log `HBX_*_API_KEY` or `HBX_*_SECRET` or their prefixes. Diagnostics report only `configured` or `missing`.

---

## 4. Local Secret & Configuration Preparation

Local development configuration has been established:

### `backend/travel-service/.env.local` (Git-ignored)
```bash
# Activities (Phase 24)
HBX_ACTIVITIES_API_KEY=<user-pasted-evaluation-key>
HBX_ACTIVITIES_SECRET=<user-pasted-evaluation-secret>
HBX_ACTIVITIES_BASE_URL=https://api.test.hotelbeds.com/activity-api/3.0
TRAVEL_ACTIVITIES_PROVIDER=hbx

# Transfers (Phase 25)
HBX_TRANSFERS_API_KEY=<user-pasted-evaluation-key>
HBX_TRANSFERS_SECRET=<user-pasted-evaluation-secret>
HBX_TRANSFERS_BASE_URL=https://api.test.hotelbeds.com/transfer-api/1.0
TRAVEL_TRANSFERS_PROVIDER=hbx
```

### `backend/travel-service/.env.example` (Tracked Template)
Contains placeholder variables with official evaluation base URLs for team members.

---

## 5. Personal Project & Transactional Safety Rule

Yuding is a personal/portfolio travel platform.

- **SEARCH & AVAILABILITY ONLY:** Provider integration is restricted to catalog search, availability queries, and rate display.
- **NO LIVE TRANSACTIONS:** Never execute real bookings, live payments, or supplier purchasing transactions.
- **EVALUATION ENVIRONMENT ONLY:** Endpoints must target `https://api.test.hotelbeds.com` and must never point to live production booking endpoints.

---

## 6. Roadmap Status

- **Phase 24:** RESUMED / PENDING IMPLEMENTATION (HBX Activities)
- **Phase 25:** PENDING IMPLEMENTATION (HBX Transfers)
- **Next Step:** User pastes evaluation credentials locally, followed by Phase 24 implementation pass.
