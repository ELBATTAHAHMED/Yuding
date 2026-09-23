# Yuding V2 — Confirmation Backend Truth

## Purpose

Phase 42 makes the confirmation and receipt experience a read-only projection of persisted,
backend-authoritative booking and payment state. A browser URL, client storage value, callback
parameter, or frontend calculation cannot create a payment or provider confirmation.

The public endpoint is:

```text
GET /bookings/{reference}/confirmation
```

It accepts the public `YUD-XXXXXXXX` booking reference only, requires JWT authentication, and
checks ownership unless the caller has the existing ADMIN or SUPPORT privilege. It returns no
internal UUID, provider order or transaction identifier, payment approval URL, token, secret, or
raw provider payload.

## Read-only boundary

`ConfirmationProjectionService` uses a read-only transaction and repository reads for the booking,
latest persisted payment, and immutable offer snapshot. It deliberately does not call
`BookingService.getBookingByReference`, since that older read path may evaluate and persist an
expiry lifecycle transition.

Opening, refreshing, polling, or directly visiting a confirmation URL therefore does not:

- create or capture a payment;
- transition a booking or payment state;
- call a provider;
- revalidate an offer or recompute an amount; or
- create a provider reservation, voucher, ticket, PNR, invoice, or support workflow.

The stored payment amount and currency are the receipt values. The selected offer snapshot is
reduced to a safe, immutable product summary of allowed human-readable scalar fields; nested
provider data, opaque offer identifiers, approval URLs, and any raw payload are excluded.

## UI state matrix

| Persisted booking state | Payment condition | Confirmation projection | User-facing meaning |
| --- | --- | --- | --- |
| `DRAFT` | any / absent | `AWAITING_PAYMENT` | This booking has not been paid. |
| `PENDING_PAYMENT` | not failed | `PAYMENT_VERIFICATION_PENDING` | Payment confirmation is in progress. |
| `PENDING_PAYMENT` or `PAYMENT_FAILED` | failed | `PAYMENT_FAILED` | Payment was not validated. |
| `PAID` | `SUCCEEDED` | `PAYMENT_VERIFIED_AWAITING_PROVIDER_CONFIRMATION` | **Paiement sandbox validé** — payment verified, provider reservation not confirmed. |
| `PENDING_PROVIDER_CONFIRMATION` | `SUCCEEDED` | `PENDING_PROVIDER_CONFIRMATION` | Provider confirmation is in progress. |
| `CONFIRMED` | `SUCCEEDED` | `CONFIRMED` | **Réservation confirmée**. |
| `CANCELLED`, `REFUNDED`, `EXPIRED` | any / absent | matching terminal state | Terminal booking outcome. |
| `PAID`, `PENDING_PROVIDER_CONFIRMATION`, or `CONFIRMED` | no succeeded payment | `INCONSISTENT_STATE` | No reliable receipt is shown; backend state requires review. |

`PAID` is intentionally never rendered as `CONFIRMED`. The frontend maps only the
`confirmationState` returned by this endpoint; it ignores all callback/query values except
`reference`, including `success`, `status`, `payment`, `amount`, and `currency`.

## Frontend contract

The canonical dossier route is `/bookings/YUD-XXXXXXXX`. The reference merely locates the backend
resource. The route performs `GET /bookings/{reference}/confirmation` through the central API
client and shows the returned state, amount, currency, provider label, and safe snapshot summary.
While payment verification is pending it performs bounded, read-only rechecks; it never captures
payment or creates a booking. Legacy `/booking/{reference}` and `/booking/confirmation?reference=`
routes redirect to this canonical route without forwarding any callback claims.

The page is guarded for login as a UX measure. Gateway and reservation-service JWT authorization
remain authoritative.

## Boundaries preserved

Phase 41 idempotency behavior is unchanged. Phase 42 does not add provider booking fulfillment,
provider reservation confirmation, ticketing, vouchers, PNRs, invoices, refunds, email, or any
Phase 43 work.

The Phase 40 note remains in force: real externally reachable HTTPS PayPal Sandbox webhook
verification is still pending deployment/configuration. The confirmation endpoint reports only
the payment and booking states already persisted by the existing backend workflow; it does not
claim that a live external webhook has been verified when one has not.
