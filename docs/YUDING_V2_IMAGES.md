# Yuding V2 — Phase 29: Images Strategy & Image Provenance

**Status:** COMPLETED  
**Branch:** `develop-v2`  
**Image Providers:** Pexels API (Destination & contextual imagery), Nuitee / LiteAPI (Authoritative hotel imagery), HBX APITUDE (Authoritative activity imagery)  

---

## 1. Overview & Image Truth Principles

Phase 29 establishes a safe, provenance-aware image architecture for Yuding V2. Prior to this phase, missing provider photos occasionally relied on static fallback stock photos (such as generic hotel bedroom or balloon tour images) which risked misleading travelers about specific physical establishments.

Phase 29 institutes strict image provenance rules across the entire platform:

1. **Destination & Contextual Imagery**:
   - Provider: **Pexels API** (`https://api.pexels.com/v1/search`)
   - Type: `STOCK_DESTINATION`
   - Role: `DESTINATION_HERO`, `DESTINATION_GALLERY`
   - Invariant: `representsEntity = false`. Clearly marked as contextual destination photography.
   - Legal Attribution: Prominent photographer name and direct backlink to photographer's Pexels profile as mandated by Pexels API terms of service.

2. **Hotel Imagery**:
   - Source: **Hotel Provider ONLY** (currently Nuitee / LiteAPI).
   - Type: `PROVIDER_ENTITY`
   - Invariant: `representsEntity = true`.
   - Fallback: Neutral placeholder (`SafeEntityImage`) with descriptive accessible messaging ("Photo non fournie par l'établissement"). **NEVER** fall back to Pexels stock photos for specific hotels.

3. **Activity Imagery**:
   - Source: **Activity Provider** (HBX APITUDE) or explicitly curated and verified Yuding experiences (`YUDING_CURATED`).
   - Type: `PROVIDER_ENTITY` or `YUDING_CURATED`.
   - Invariant: `representsEntity = true`.
   - Fallback: Neutral placeholder (`SafeEntityImage`) with descriptive accessible messaging ("Photo non fournie pour cette activité"). **NEVER** fall back to Pexels stock photos for specific activities.

4. **Transfers, Trains, and Flights**:
   - Zero deceptive stock vehicle imagery presented as a specific vehicle. Vehicle categories display clean SVG iconography or neutral placeholders.

---

## 2. Architecture & Security Isolation

### Provider Topology & Key Isolation
- `PEXELS_API_KEY` is strictly held on the backend (`backend/travel-service/.env.local`).
- Frontend (`frontend/web`) never receives or interacts directly with the Pexels API key.
- All client imagery requests route through the **API Gateway** (`gateway-service`, port 8888) to `travel-service` (port 8082) at `/travel/images/**`.
- Next.js remote domain allowlist in `next.config.js` explicitly secures image origins:
  - `images.pexels.com`
  - `*.liteapi.travel`
  - `*.hotelbeds.com`

---

## 3. Backend Endpoints & Models

### REST Endpoints
- **`GET /travel/images/destination?city={city}&country={country}&countryCode={code}&limit={n}`**:
  - Fetches contextual landscape destination photos from Pexels.
  - Returns `DestinationImagesResponseDto` with HTTP 200 and standard `Cache-Control: public, max-age=3600`.
  - Error containment: upstream timeouts, missing keys, or rate limits return HTTP 200 with an empty image list (`images: []`), never crashing travel search flows.

### Unified Image Asset Model (`ImageAssetDto`)
```json
{
  "id": "pexels-123456",
  "url": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  "thumbnailUrl": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&h=350",
  "altText": "Marrakech Medina view",
  "sourceType": "STOCK_DESTINATION",
  "sourceProvider": "PEXELS",
  "photographerName": "Karim Bennani",
  "photographerUrl": "https://www.pexels.com/@karim",
  "attributionText": "Photo par Karim Bennani sur Pexels",
  "attributionUrl": "https://www.pexels.com/photo/123456",
  "role": "DESTINATION_HERO",
  "representsEntity": false
}
```

---

## 4. Frontend Components

Located in `frontend/web/src/components/travel/`:

1. **`SafeEntityImage.tsx`**:
   - Fail-safe entity image component for hotels, rooms, and activities.
   - Renders provider photos when valid; gracefully falls back to a neutral, styled placeholder with building/activity icon and explicit label if the image URL is missing or fails to load.
   - Zero misleading stock replacement.

2. **`DestinationImageGallery.tsx`**:
   - Responsive hero gallery component for destination exploration pages (`/hotels`, `/activities`).
   - Displays landscape photography with thumbnail carousel selection.
   - Features prominent photographer credits with clickable external links to Pexels and legal attribution badge ("Photos fournies par Pexels").

---

## 5. Verification & Testing

- **Backend Unit & Integration Tests**:
  - `PexelsClientTest`: 8 tests covering authentication headers, query parameters, rate limits, 401/403 remapping, missing keys, and timeouts.
  - `PexelsImageProviderTest`: 2 tests verifying metadata mapping and `representsEntity = false` enforcement.
  - `ImageServiceTest`: 4 tests validating error containment, blank inputs, and provider delegation.
  - `TravelImageControllerTest`: 2 MockMvc web layer tests verifying cache headers and JSON contracts.
  - `ImageProvenanceTest`: 4 tests verifying Nuitee and HBX provider provenance tagging.
- **Frontend Contract & Component Tests**:
  - `image-provenance.test.ts`: 6 tests asserting type invariant guarantees, query key caching, and gateway endpoint formatting.
  - Full suite passes: 79 frontend unit tests, 199 backend tests, 0 failures.
