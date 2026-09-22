# Yuding V2 — Server-side Authoritative Pricing Architecture (Phase 37)

## 1. Core Principle: Zero Client Authority over Monetary Values

In Yuding V2, the frontend / browser has **zero authority** over monetary amounts, currencies, base rates, taxes, fees, surcharges, discounts, foreign exchange rates, or payable totals.

```
+-------------------------------------------------------------+
| Browser / DevTools / Client Request                         |
| (Zero authority: no price fields accepted / ignored)        |
+-------------------------------------------------------------+
                              |
                              v POST /bookings/{YUD-REF}/pricing (NO BODY)
+-------------------------------------------------------------+
| Gateway & Reservation Service Boundary                      |
| Enforce Authenticated Ownership (User A cannot price User B)|
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Trusted Backend Persistent State Sources:                   |
| 1. Booking (DRAFT status, immutable reference)              |
| 2. OfferSnapshot (Immutable selected details & provider)    |
| 3. OfferRevalidation (Phase 36 fresh live revalidation)     |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Readiness Gate: BookingReadinessPolicy                      |
| - Offer MUST be AVAILABLE                                   |
| - Revalidation MUST be fresh (now < validUntil)             |
| - Changed price MUST be acknowledged for THIS revalidation  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| ServerPricingFactory & Canonical Hash                       |
| - Provider-native currency & amount                         |
| - Truthful breakdown (NULL if unknown, 0.00 only if 0)      |
| - Deterministic SHA-256 pricing hash                        |
| - validUntil = revalidation.validUntil                      |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| booking.server_pricing_quotes Table (Append-Only)           |
| - Unique constraint on revalidation_id                      |
| - Immutable historical audit record                         |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
| Payment Readiness Gate: BookingPricingReadinessPolicy       |
| - Gates entry to Phase 38 Payment Preparation               |
+-------------------------------------------------------------+
```

---

## 2. Server Pricing Input Sources

Phase 37 builds authoritative pricing exclusively from trusted server-side state:
1. **`Booking`**: Must exist in `booking.bookings` schema, belong to the authenticated user (or authorized ADMIN/SUPPORT), and be in `DRAFT` status.
2. **`OfferSnapshot`**: Immutable historical snapshot in `booking.offer_snapshots` capturing the user's initial selection.
3. **`OfferRevalidation`**: The latest revalidation record in `booking.offer_revalidations` produced by Phase 36 live revalidation.

> **Critical Invariant**: Phase 37 pricing consumes the **current provider amount and currency** from the latest fresh Phase 36 revalidation. It never reverts to historical Phase 35 snapshot prices or ordinary search cache estimates.

---

## 3. Phase 36 Readiness & Freshness Enforcement

Before creating a server pricing quote, `BookingReadinessPolicy.canProceedToServerPricing(...)` is evaluated:
- **Freshness**: If `now >= revalidation.validUntil`, pricing is rejected immediately with `REVALIDATION_REQUIRED`.
- **Availability**: If `availabilityStatus` is `UNAVAILABLE`, `UNKNOWN`, or `REVALIDATION_UNSUPPORTED`, pricing is rejected.
- **Price Changes**: If `priceStatus == "CHANGED"`, `priceChangeAcceptedAt` must be populated on that exact revalidation record. If unacknowledged, pricing is rejected with `PRICE_CHANGE_ACKNOWLEDGEMENT_REQUIRED`.
- **Unchanged Price**: If `priceStatus == "UNCHANGED"`, no explicit user acknowledgment is needed; pricing proceeds directly.

---

## 4. Provider-Native Currency & Truthful Breakdown

1. **Provider-Native Money as Truth**:
   - The authoritative payment currency is the provider's native currency (e.g. `EUR`, `USD`, `MAD`).
   - Historical display currency conversions from Phase 35 are historical discovery facts and are **never** used as payment truth.
2. **Breakdown Truthfulness**:
   - `base_amount`, `tax_amount`, and `fee_amount` are populated **only** if the provider supplied reconciled breakdown components that sum exactly to `total_amount` (`base + taxes + fees == total`).
   - In this case, `breakdown_complete = true`.
   - If only `total_amount` is provided by the provider, breakdown components remain `NULL` and `breakdown_complete = false`.
   - **Unknown ≠ Zero**: Unknown breakdown values are never fabricated as fake zeros or fake `base = total`.
3. **No-Fare Train Behavior**:
   - Schedule-only trains (e.g., Transitous / ONCF without fare) have `pricing_status = NOT_PRICED` or `NOT_APPLICABLE`, with `total_amount = null` and `currency = null`.
   - No fake `0 MAD` or `0 EUR` is ever fabricated.
   - Such bookings cannot proceed to monetary payment.

---

## 5. Persistence, Immutability & Revalidation Binding

- **Database Table**: `booking.server_pricing_quotes` (Flyway migration `V17__server_side_pricing.sql`).
- **Revalidation Binding**: Every pricing quote has a foreign key `revalidation_id` with a database `UNIQUE (revalidation_id)` constraint.
- **Append-Only History**:
  - Pricing records are strictly immutable (no updates/deletes).
  - If a user triggers a new Phase 36 revalidation (`Revalidation B`), a new pricing quote (`Pricing B`) is created.
  - Previous quotes remain in the database for auditing and history.
- **Validity Window**:
  - `pricing.validUntil = revalidation.validUntil`.
  - A server pricing quote cannot outlive its source provider revalidation.

---

## 6. Deterministic SHA-256 Pricing Hash

To prevent accidental corruption, verify integrity, and bind future payments to exact quotes:
```java
SHA256(bookingId + ":" + snapshotId + ":" + revalidationId + ":" + productType + ":" + provider + ":"
       + pricingStatus + ":" + baseAmount + ":" + taxAmount + ":" + feeAmount + ":" + totalAmount + ":"
       + currency + ":" + breakdownComplete + ":" + validUntilEpochMillis)
```
- Standardized scale (`2` decimal places) with `RoundingMode.HALF_UP`.
- Null amounts canonicalized as `"NULL"`.
- Uppercase normalized currency codes.

---

## 7. Gate to Phase 38: Payment Readiness Policy

`BookingPricingReadinessPolicy.canProceedToPaymentPreparation(...)` acts as the gatekeeper for future Phase 38 payment operations:
- Booking status is `DRAFT`.
- Pricing quote is bound to the latest eligible revalidation.
- Current server clock is before `validUntil` of both quote and revalidation.
- `pricingStatus == PRICED` with non-null positive total and currency.
- Unpriced offers (`NOT_PRICED`, `NOT_APPLICABLE`) evaluate to `false`.

---

## 8. Architectural Boundaries

- **Phase 37 Scope**: Server-side authoritative pricing persistence and validation only.
- **Phase 38 Boundary**: No payment gateways (Stripe/PayPal), payment intents, charges, authorizations, or captures are implemented in Phase 37.
- **Phase 39 Boundary**: Zero credit card / PAN / CVV handling.
- **Zero Provider Quota Usage**: Phase 37 consumes persisted Phase 36 revalidations without making additional calls to external travel providers.
