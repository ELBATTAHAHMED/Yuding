# Yuding V2 — Payment Provider Abstraction & PayPal Sandbox Checkout (Phase 38)

## 1. Architectural Overview & Boundaries

Phase 38 establishes a **provider-neutral payment architecture** for Yuding V2. Core booking workflows never depend directly on specific payment gateways (such as PayPal, Stripe, etc.).

```
+--------------------------------------------------------------------------+
| Browser / DevTools / Client (Zero Price Authority)                       |
+--------------------------------------------------------------------------+
                                    |
                                    v POST /bookings/{ref}/payment/create-order
+--------------------------------------------------------------------------+
| Gateway (8888) & Reservation Service Boundary (8090)                     |
| Enforce RS256 JWT Authenticated Ownership                                |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| Payment Readiness Gate: BookingPricingReadinessPolicy                    |
| - Booking MUST be DRAFT / PENDING_PAYMENT / PAYMENT_FAILED               |
| - Phase 37 ServerPricingQuote MUST be PRICED and fresh (not expired)     |
| - Amount & Currency derive EXCLUSIVELY from ServerPricingQuote           |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| PaymentProvider Abstraction Layer                                        |
|                                                                          |
|       +--------------------------------------------------+               |
|       |              <<interface>>                       |               |
|       |             PaymentProvider                      |               |
|       |  + createPaymentOrder(PaymentOrderCommand)       |               |
|       |  + capturePaymentOrder(PaymentCaptureCommand)    |               |
|       +--------------------------------------------------+               |
|                     ^                             ^                      |
|                     |                             |                      |
|        +---------------------------+  +--------------------------+       |
|        |PayPalSandboxPaymentProvider|  |   MockPaymentProvider    |      |
|        | - https://api-m.sandbox...|  | - In-memory / tests      |      |
|        | - OAuth2 client_cred      |  | - Deterministic capture  |      |
|        | - v2/checkout/orders      |  +--------------------------+       |
|        +---------------------------+                                     |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| PostgreSQL 16 schema payment.payments (Flyway V18)                       |
| - payment_reference: PAY-XXXXXXXX                                        |
| - pricing_quote_id: FK to booking.server_pricing_quotes                  |
| - provider_name, provider_order_id, provider_transaction_id              |
| - status: INITIATED -> REQUIRES_ACTION -> AWAITING_WEBHOOK -> SUCCEEDED / FAILED
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| Booking Lifecycle State Transitions (Phase 40 Webhook Authority)         |
| - initiatePaymentOrder()      -> BookingStatus.PENDING_PAYMENT           |
| - capturePayment(HTTP 200)    -> PaymentStatus.AWAITING_WEBHOOK          |
|                                  (Booking remains PENDING_PAYMENT)       |
| - webhook(CAPTURE.COMPLETED)  -> PaymentStatus.SUCCEEDED, Booking.PAID   |
| - webhook(CAPTURE.DENIED)     -> PaymentStatus.FAILED, PAYMENT_FAILED    |
+--------------------------------------------------------------------------+
```

---

## 2. Safety Rules & Sandbox Isolation

1. **PayPal Sandbox Only**:
   - Strictly `https://api-m.sandbox.paypal.com`.
   - Never calls `api-m.paypal.com`.
2. **Zero Raw Card Storage**:
   - Raw PAN, CVV, or card credentials are NEVER accepted, stored, logged, or persisted on backend.
3. **Zero Secret Leakage**:
   - PayPal Client Secret and Access Tokens are never logged, never returned in DTOs, and never exposed to the frontend.
4. **Authoritative Pricing**:
   - Amount and currency are sourced exclusively from `ServerPricingQuote`. The client request accepts zero monetary parameters.

---

## 3. Database Schema (Flyway V18)

Table: `payment.payments`
- `id UUID PRIMARY KEY`
- `booking_id UUID NOT NULL`
- `pricing_quote_id UUID REFERENCES booking.server_pricing_quotes(id)`
- `payment_reference VARCHAR(32) NOT NULL UNIQUE` (e.g. `PAY-XXXXXXXX`)
- `provider_name VARCHAR(50) NOT NULL` (e.g. `paypal-sandbox`, `mock`)
- `provider_order_id VARCHAR(255)`
- `provider_transaction_id VARCHAR(255) UNIQUE`
- `amount NUMERIC(12,2) NOT NULL`
- `currency VARCHAR(3) NOT NULL`
- `status VARCHAR(24) NOT NULL` (`INITIATED`, `REQUIRES_ACTION`, `SUCCEEDED`, `FAILED`, `REFUNDED`)
- `approval_url TEXT`
- `client_token VARCHAR(255)`
- `version INT NOT NULL DEFAULT 0`
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`

---

## 4. Frontend 3D Animated Card Parity & Zero Card Ownership (Phase 39)

The checkout experience in `frontend/web/src/app/(checkout)/booking/[reference]/payment` provides:
- Interactive 3D CSS card flip (`perspective: 1000px`, `transform-style: preserve-3d`).
- Manual flip toggle on the back CVC strip for preview inspection.
- Purely decorative card art rendering permanently masked digits (`•••• •••• •••• ••••`), static expiry (`••/••`), and static CVC (`•••`).
- Zero Yuding ownership of raw card credentials (see `docs/YUDING_V2_CARD_DATA_SECURITY.md`).
- Truthful fallback message when direct provider-hosted card entry is unavailable on the sandbox account.
- PayPal Sandbox approval checkout.
- Authoritative pricing summary banner guaranteeing certified server amounts.

