# Yuding V2 — Live Offer Revalidation & Repricing Architecture (Phase 36)

## Overview
Phase 36 implements server-authoritative live offer revalidation and repricing for Yuding V2. It ensures that an outdated or unverified search price can **NEVER** flow directly toward payment or server pricing.

---

## 1. Core Invariants & Safety Rules

1. **Snapshot vs Live Revalidation**:
   - The Phase 35 `OfferSnapshot` represents **historical selection truth** (what was displayed and selected at discovery time).
   - Phase 36 revalidation answers: *"Does the upstream provider still offer this exact selection right NOW, and what is the current provider-native price NOW?"*
   - Freshness of the historical snapshot does not waive live revalidation before proceeding toward server pricing.

2. **Strict Cache Bypass**:
   - Provider revalidation **MUST NEVER** be satisfied by the Redis search cache.
   - Revalidation routes directly to the upstream provider (or read-only schedule authority) bypassing discovery caches.

3. **Zero Transactional Provider Calls (Safety Rule)**:
   - Revalidation is strictly read-only rate and availability verification.
   - **NEVER** perform real bookings, inventory holds, prebooks, reservations, authorizations, or payments.
   - If a provider requires a transactional hold/prebook step merely to check rate (e.g. Nuitee prebook), `REVALIDATION_UNSUPPORTED` is returned.

4. **No Frontend Price Authority**:
   - The public revalidation endpoint `POST /bookings/{bookingReference}/revalidate` accepts no price, currency, availability, or provider data from the client.
   - The server derives all context from the trusted immutable `OfferSnapshot`.

---

## 2. Provider-Specific Revalidation & Matching Rules

| Domain | Provider | Revalidation Strategy | Exact Match Criteria | Prohibited Actions |
| :--- | :--- | :--- | :--- | :--- |
| **Flights** | Scrappa | Live search query (cache bypassed) | Origin, Destination, Departure Date/Time, Airline, Flight Number | No flight booking |
| **Hotels** | Nuitee | Live search/rates check (cache bypassed) | Hotel ID, Check-in, Check-out, Room Name, Rate ID | Zero `prebook` or inventory hold |
| **Activities** | HBX | Live activity search (cache bypassed) | Destination, Date, Title, Activity/Offer ID | No activity booking |
| **Transfers** | HBX | Live transfer search (cache bypassed) | Pickup, Dropoff, Date, Time, Vehicle Model | No transfer booking |
| **Trains (MA)** | ONCF GTFS | Local schedule index matching | Origin, Destination, Date, Train Number | No ONCF booking; no fake fare |
| **Trains (Global)** | Transitous | Live journey search (cache bypassed) | Origin, Destination, Time, Legs | No ticketing; no fake fare |

---

## 3. Normalized Status Semantics

### Availability Status (`OfferAvailabilityStatus`)
- `AVAILABLE`: Upstream provider positively matched the selected offer.
- `UNAVAILABLE`: Provider responded successfully and the selected offer/rate is no longer available.
- `UNKNOWN`: Availability could not be safely or deterministically verified.
- `REVALIDATION_UNSUPPORTED`: Revalidation cannot be performed without prohibited transactional actions.

> [!IMPORTANT]
> Provider failures (HTTP 5xx, timeouts, rate limits, 401/403) throw `TravelProviderException` (HTTP 502/503) and are **never** mapped to `UNAVAILABLE`.

### Price Status (`OfferPriceStatus`)
- `UNCHANGED`: Current provider price matches snapshot price exactly (`BigDecimal.compareTo == 0`).
- `CHANGED`: Current provider price differs from snapshot (both increases and decreases, or currency changes).
- `NOT_AVAILABLE`: Selected offer is unavailable or provider returned no price.
- `NOT_APPLICABLE`: Product has no provider fare (e.g. timetable schedules).

---

## 4. Price-Change Acknowledgement & Readiness Policy

1. **Price Comparison Rules**:
   - Compared in **provider-native currency** (`providerAmount`, `providerCurrency`).
   - Scale-independent: `100.0 EUR` vs `100.00 EUR` is `UNCHANGED`.
   - No fresh FX conversion calls are performed during Phase 36 revalidation (Phase 37 owns final server pricing).

2. **Price Change Acknowledgement**:
   - If `priceStatus == CHANGED`, the booking cannot proceed to server pricing until the user explicitly accepts the current fresh quote via:
     `POST /bookings/{bookingReference}/revalidation/accept-price-change`
   - The request contains no client-supplied price or currency. The server marks `priceChangeAcceptedAt = now()` on the latest valid quote.

3. **Readiness Policy Gate (`BookingReadinessPolicy`)**:
   `canProceedToServerPricing` returns `true` **only if**:
   - Booking is in `DRAFT` status.
   - `OfferSnapshot` exists.
   - Latest `OfferRevalidation` exists and is fresh (`now < validUntil`).
   - `availabilityStatus == AVAILABLE`.
   - `priceStatus` is `UNCHANGED` or `NOT_APPLICABLE`, OR `priceStatus == CHANGED` and user acknowledged this exact result (`priceChangeAcceptedAt != null`).

---

## 5. Database Schema (Flyway V16)

```sql
-- Schema: booking
CREATE TABLE IF NOT EXISTS booking.offer_revalidations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    offer_snapshot_id UUID NOT NULL,
    provider VARCHAR(64) NOT NULL,
    product_type VARCHAR(32) NOT NULL,
    availability_status VARCHAR(32) NOT NULL,
    price_status VARCHAR(32) NOT NULL,
    snapshot_provider_amount NUMERIC(12, 2),
    snapshot_provider_currency VARCHAR(3),
    current_provider_amount NUMERIC(12, 2),
    current_provider_currency VARCHAR(3),
    provider_offer_id VARCHAR(255),
    matched_provider_offer_id VARCHAR(255),
    revalidated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    valid_until TIMESTAMPTZ NOT NULL,
    provider_expires_at TIMESTAMPTZ,
    price_change_accepted_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT fk_offer_revalidations_booking
        FOREIGN KEY (booking_id)
        REFERENCES booking.bookings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_offer_revalidations_snapshot
        FOREIGN KEY (offer_snapshot_id)
        REFERENCES booking.offer_snapshots(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_revalidations_product_type
        CHECK (product_type IN ('FLIGHT', 'HOTEL', 'ACTIVITY', 'TRANSFER', 'TRAIN')),

    CONSTRAINT chk_revalidations_availability
        CHECK (availability_status IN ('AVAILABLE', 'UNAVAILABLE', 'UNKNOWN', 'REVALIDATION_UNSUPPORTED')),

    CONSTRAINT chk_revalidations_price_status
        CHECK (price_status IN ('UNCHANGED', 'CHANGED', 'NOT_AVAILABLE', 'NOT_APPLICABLE')),

    CONSTRAINT chk_revalidations_snapshot_curr
        CHECK (snapshot_provider_currency IS NULL OR snapshot_provider_currency ~ '^[A-Z]{3}$'),

    CONSTRAINT chk_revalidations_curr_curr
        CHECK (current_provider_currency IS NULL OR current_provider_currency ~ '^[A-Z]{3}$')
);

CREATE INDEX idx_offer_revalidations_booking_id ON booking.offer_revalidations(booking_id);
CREATE INDEX idx_offer_revalidations_snapshot_id ON booking.offer_revalidations(offer_snapshot_id);
CREATE INDEX idx_offer_revalidations_revalidated_at ON booking.offer_revalidations(booking_id, revalidated_at DESC);
```

---

## 6. Public & Internal Endpoints

| Endpoint | Method | Path | Visibility | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Public Revalidate** | `POST` | `/bookings/{reference}/revalidate` | Gateway / Auth | Triggers live provider revalidation on offer snapshot |
| **Public Accept Price** | `POST` | `/bookings/{reference}/revalidation/accept-price-change` | Gateway / Auth | Explicitly acknowledges and accepts a changed price quote |
| **Internal Revalidate** | `POST` | `/internal/travel/offers/revalidate` | Service-to-Service | Internal Feign endpoint from `reservation-service` to `travel-service` |
