# Yuding V2 — Offer Details Pages & Travel UI Architecture (Phase 32)

This document describes the architectural principles, component system, offer resolution mechanics, and visual design standards introduced in Phase 32.

---

## 1. Executive Summary

Phase 32 introduces dedicated Offer Details pages for all five travel verticals:
- **Flights**: `/flights/[offerId]`
- **Hotels**: `/hotels/[offerId]`
- **Activities**: `/activities/[offerId]`
- **Transfers**: `/transfers/[offerId]`
- **Trains**: `/trains/[offerId]`

It also refines the travel search pages (`/flights`, `/hotels`, `/activities`, `/transfers`, `/trains`) to eliminate visual clutter, nested boxes, and inconsistent actions.

---

## 2. Core Architectural Principles

### 2.1 Discovery State vs. Booking Snapshot Boundary
- **Offer Details represent discovery state**: They display normalized data returned from search results and cached discovery sessions.
- **Phase 35 Boundary**: Permanent database snapshots (`booking_offer_snapshots` in PostgreSQL) belong strictly to Phase 35. No database tables were created in Phase 32.
- **Phase 36 Mandatory Revalidation**: A cached search offer is strictly non-authoritative. Final booking must always revalidate price and availability server-side with upstream providers.

### 2.2 Truth Invariant — Zero Fabricated Data
- **Baggage**: Displayed only when Scrappa provides baggage allowances. Absence of baggage data is never converted to "No baggage" or "1 checked bag".
- **Cancellation**: Refundability rules and cancellation deadlines are shown strictly when returned by Nuitee / HBX. Absence of data is never converted to a false negative or fake "free cancellation".
- **Taxes & Fees**: Displayed only if the provider exposes structured tax lines. Total amounts are never mathematically split into inferred taxes.
- **Train Fares**: When fare data is absent in community GTFS (e.g. Moroccan rail network ONCF), the fare is strictly kept as `null` with a clear, honest notice: *"Tarif non disponible via cette source de données (horaires indicatifs)"*. No fake MAD conversion is ever calculated.

### 2.3 Provider Provenance & Transparency
Every details page preserves explicit provider attribution:
- Flights: `SCRAPPA` (Google Flights data chain)
- Hotels: `NUITEE` (Nuitee Connect)
- Activities: `HBX` / `YUDING_CUSTOM`
- Transfers: `HBX`
- Trains: `ONCF GTFS` (Morocco) / `TRANSITOUS` (International multimodal)

### 2.4 Image Provenance Preservation
- Hotel images use Nuitee-authoritative images only (no Pexels hotel fallback).
- Activity images use HBX or curated assets only (never random destination stock).
- `SafeEntityImage` handles missing or broken URLs gracefully.

---

## 3. Offer Resolution & Session Expiration

### 3.1 Session Store (`src/lib/offer-store.ts`)
- Search results are automatically indexed into an in-memory map and backed by `sessionStorage`.
- When navigating to `/[product]/[offerId]`, `getOfferDetail(product, offerId)` resolves the full offer immediately.
- On browser page refresh within the same active tab session, `sessionStorage` ensures uninterrupted display.

### 3.2 Graceful Expiration (`<OfferExpiredState>`)
If an offer cannot be resolved (e.g., direct deep link in a new tab without an active search session, or expired session storage):
- The page renders a polished `<OfferExpiredState>` informing the user that search data has expired.
- Provides a direct "Retourner à la recherche" action without crashing or displaying raw 404 JSON.

---

## 4. Shared Details Design System (`src/components/travel/details/`)

| Component | Purpose |
|---|---|
| `OfferDetailsShell` | Responsive container with breadcrumb back navigation, 2-column desktop grid with sticky price sidebar, and mobile sticky bottom action bar. |
| `OfferDetailsHeader` | Top summary with title, route/location, provider badge, duration, and metadata tags. |
| `OfferPricePanel` | Prominent MAD price (Phase 28 `PriceDisplay` model), original currency breakdown, and checkout selection CTA. |
| `RouteTimeline` | Segmented timeline for flights (layovers, carriers, times), train journeys (stops, connections), and transfer routes. |
| `ConditionList` | Structured cards for cancellation policies, refundability, baggage allowances, check-in instructions, and supplier terms. |
| `OfferExpiredState` | User-friendly expired offer notice with search redirect. |
| `DetailLoadingSkeleton` | Coherent loading state mirroring the details layout. |

---

## 5. Vertical Details Specifications

### 5.1 Flights (`/flights/[offerId]`)
- **Route & Segments**: Origin and destination IATA codes and city names, departure/arrival timestamps, carrier names, flight numbers, aircraft type.
- **Connection Timeline**: Individual legs, layover durations, and transfer airport codes.
- **Cabin & Baggage**: Cabin class, seats remaining (when supplied), baggage policies (only when present).

### 5.2 Hotels (`/hotels/[offerId]`)
- **Hotel Identity**: Full address, city, country, star rating, provider category.
- **Image Gallery**: Authoritative provider imagery rendered via `SafeEntityImage`.
- **Room Selection**: Interactive room list with board plans (Breakfast Included / Room Only), bed configurations, cancellation deadlines, and price per night.

### 5.3 Activities (`/activities/[offerId]`)
- **Activity Summary**: Category, duration, destination context, participant pricing.
- **Description & Inclusions**: Full multi-line description, supplier attribution, and practical details.

### 5.4 Transfers (`/transfers/[offerId]`)
- **Point-to-Point Route**: Pickup location, dropoff location, date and scheduled time.
- **Vehicle Specifications**: Vehicle model, vehicle type (Private / Shared / Minibus), passenger capacity.

### 5.5 Trains (`/trains/[offerId]`)
- **Journey Schedule**: Departure/arrival stations, scheduled times, operator name, train number.
- **Connections & Intermediate Stations**: Multi-leg connection steps with transfer durations and list of intermediate stops.
- **Source Disclosure**: Community GTFS / Transitous engine disclosure and link to operator official portal.

---

## 6. Verification & Automated Test Coverage

- **`src/lib/__tests__/offer-details.test.ts`**: Verifies store persistence, product namespace isolation, session expiration, multi-leg train resolution, and null-price preservation.
- **Full Suite**: 17 test suites, 100 tests passing with zero live provider network calls.
- **TypeScript**: `npx tsc --noEmit` passing with zero errors.
- **Production Build**: `next build` passing and prerendering all routes.
