# Yuding V2 — Favorites, Saved Trips, Recent Searches & Recently Viewed (Phase 50)

## Overview

Phase 50 equips authenticated Yuding users with a centralized, secure personal library to save, organize, and quickly revisit their travel research:
1. **Favorites**: Bookmarked hotels, activities, and destinations with snapshot pricing and live offer revalidation links.
2. **Saved Trips**: Direct references to AI-generated smart trip plans (`TRP-XXXXXXXX`) created in Phase 48, with verified ownership and non-destructive unsave semantics.
3. **Recent Searches**: High-convenience query history across flights, hotels, activities, and trips, with automatic SHA-256 criteria deduplication, expired date flagging, capacity pruning, and sensitive field stripping.
4. **Recently Viewed**: Passive history tracking when browsing detail pages (hotels, activities, destinations) with 90-day retention and automated capacity trimming.

---

## Architectural Principles & Ownership

### 1. Service & Schema Ownership
- Owned by `identity-service` in schema `identity`.
- Tables:
  - `identity.user_favorites`
  - `identity.user_saved_trips`
  - `identity.user_recent_searches`
  - `identity.user_recent_views`
- Strictly conforms to Yuding V2 zero-cross-schema-FK rule: references to external entities (such as trip plans `TRP-XXXXXXXX` in `ai-service`) are maintained as stable business strings.
- Ownership is verified at API runtime via REST client (`TripPlanClient`) to `ai-service` using the caller's JWT/`X-User-Id`.

### 2. Data Minimization & Privacy Protection
- **No IP Addresses or Browser Fingerprints**: Never stored in user library records.
- **Zero Card Data / PAN / CVV / Secrets**: Forbidden keys (`role`, `apiKey`, `creditCard`, `token`, `password`, `rawProviderPayload`, etc.) are aggressively filtered out during JSON payload sanitization.
- **No Implicit AI Memory**: Library entries are user-explicit and are not injected implicitly into AI system prompts without user consent.
- **Server Authorization**: IDOR is prevented by deriving the user identifier strictly from authenticated server context (`X-User-Id`). All deletions require ownership match (`findByPublicReferenceAndUserId`), returning `404 Not Found` on mismatch.

### 3. Price Snapshot vs Live Truth
- Favorites store a snapshot of the observed price (`price_snapshot`, `currency_snapshot`, `captured_at`).
- The frontend clearly labels snapshot prices as *"Prix observé le DD/MM/YYYY"* and directs the user to live booking/search flows to obtain fresh authoritative provider pricing.

### 4. Non-Destructive Saved Trips
- Unsaving a trip (`DELETE /api/account/saved-trips/{ref}`) only removes the bookmark link in `identity.user_saved_trips`.
- The underlying AI trip plan in `ai-service` (`TRP-XXXXXXXX`) remains intact and unmodified.

---

## Flyway Database Migrations

- `V29__user_library_favorites_saved_trips_and_history.sql`:
  - Created tables with primary key `id (UUID)`, `public_reference (VARCHAR(32) UNIQUE)`, `user_id (UUID NOT NULL)`.
  - Composite unique indexes for deduplication:
    - `uk_user_favorites_item`: `(user_id, resource_type, resource_reference)`
    - `uk_user_saved_trips_plan`: `(user_id, trip_plan_reference)`
    - `uk_user_recent_searches_hash`: `(user_id, search_type, criteria_hash)`
    - `uk_user_recent_views_item`: `(user_id, resource_type, resource_reference)`
  - Indexing on recency timestamps for fast sorting and pruning:
    - `idx_user_favorites_user_captured`
    - `idx_user_saved_trips_user_saved`
    - `idx_user_recent_searches_user_recency`
    - `idx_user_recent_views_user_recency`
- `V30__expand_search_type_constraint.sql`:
  - Expanded search type constraint to support singular and plural verticals: `'FLIGHT', 'HOTEL', 'ACTIVITY', 'TRIP', 'TRANSFER', 'TRAIN', 'FLIGHTS', 'HOTELS', 'ACTIVITIES', 'TRANSFERS', 'TRAINS'`.

---

## REST Endpoints (via API Gateway port 8888)

### Favorites
- `POST /api/account/favorites`: Save or update favorite item.
- `GET /api/account/favorites?type={HOTEL|ACTIVITY|DESTINATION}`: List user favorites.
- `DELETE /api/account/favorites/{publicReference}`: Delete favorite by public reference.
- `DELETE /api/account/favorites?type={type}&ref={resourceReference}`: Delete favorite by resource reference.

### Saved Trips
- `POST /api/account/saved-trips`: Bookmark an AI trip plan (body: `{"tripPlanReference": "TRP-XXXXXXXX"}`).
- `GET /api/account/saved-trips`: List user's saved trips.
- `DELETE /api/account/saved-trips/{reference}`: Unsave a trip plan (non-destructive).

### Recent Searches
- `POST /api/account/recent-searches`: Record a search query with sanitization and SHA-256 deduplication.
- `GET /api/account/recent-searches`: List recent searches (max 20, newest first).
- `DELETE /api/account/recent-searches/{reference}`: Delete a single search entry.
- `DELETE /api/account/recent-searches`: Clear all search history.

### Recently Viewed
- `POST /api/account/recent-views`: Record a viewed item on detail page view.
- `GET /api/account/recent-views`: List recently viewed items (max 30, newest first).
- `DELETE /api/account/recent-views/{reference}`: Delete a single viewed item entry.
- `DELETE /api/account/recent-views`: Clear all view history.

---

## Frontend Implementation (`frontend/web/`)

- **Page**: `/account/favorites`
  - 4 tabs: *Favoris*, *Voyages sauvegardés*, *Recherches récentes*, *Récemment consultés*.
  - Synced to URL query parameter `?tab=favorites|trips|searches|views`.
  - Open, airy layout following Phase 49 profile design (subtle cards, teal accents, light/dark mode).
  - Empty states with call-to-action buttons redirecting to `/hotels`, `/planifier`, or `/flights`.
  - Re-run search buttons routing to canonical search URLs (`/flights?origin=...&destination=...`).
  - Saved Trip cards direct to `/planifier?tripRef=TRP-XXXXXXXX` to view itinerary details.
- **Common Components**:
  - `FavoriteButton`: Reusable heart icon toggle supporting optimistic UI and active state.
- **Instrumentation**:
  - `HotelCard` & Hotel detail page (`/hotels/[offerId]`): integrated `FavoriteButton` and `recordRecentView`.
  - Activity detail page (`/activities/[offerId]`): integrated `FavoriteButton` and `recordRecentView`.
  - Search pages (`/hotels`, `/activities`, `/flights`, `/planifier`): integrated `recordRecentSearch`.

---

## Verification & Testing

- **Integration Tests**: `scripts/test_phase50.cjs` (52/52 assertions passing).
- **Backend Unit & Security Tests**: `UserLibraryServiceTest`, `UserLibrarySecurityTest` (18/18 passing).
- **Frontend Tests**: 141 tests passing across 41 suites; 0 TypeScript errors (`npx tsc --noEmit`).
