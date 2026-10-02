# Phase 51: demo cancellation and refund rules

Yuding does not make supplier reservations or charge real cards in this flow. `DemoCancellationProvider` changes only Yuding's persisted demo booking. Its `DEMO_ONLY` outcome must never be presented as a supplier confirmation. Search and price revalidation may read live supplier data, but cancellation never calls a production supplier endpoint.

| Product | Policy data available in the current code | Phase 51 cancellation action |
| --- | --- | --- |
| Nuitee hotels | Persisted room `refundable` flag and cancellation deadline, when supplied | Local demo adapter only. Nonrefundable rates have no refund; refundable rates before a known deadline permit a refund of the captured demo payment. After the deadline or with incomplete terms, automatic cancellation is blocked. |
| Scrappa flights | No structured cancellation/refund terms or sandbox cancel endpoint | Local demo adapter for an explicitly paid mock-card booking; otherwise unknown/manual policy and no automatic cancellation. |
| HBX activities | No structured cancellation/refund terms or sandbox cancel endpoint | Same demo-only/mock policy; otherwise unknown/manual. |
| HBX transfers | No structured cancellation/refund terms or sandbox cancel endpoint | Same demo-only/mock policy; otherwise unknown/manual. |
| Train search providers | Timetables only; no ticket cancellation terms or sandbox cancel endpoint | Same demo-only/mock policy; otherwise unknown/manual. |

Trusted persisted `cancellationPolicy` metadata can provide a matching-currency partial fee. The fee must be nonnegative and at most the captured amount. Missing or contradictory supplier terms never create a free supplier refund. A mock-card capture has an explicit Yuding demo full-refund rule, unless a more specific trusted rate rule applies. PayPal remains sandbox-only, and a PayPal payment with unknown policy is blocked from automatic cancellation.

The booking retains its existing statuses. A unique `booking.cancellation_requests` ledger stores `PROCESSING → CANCELLED` or `PROCESSING → PROVIDER_FAILED`. On provider success, the booking becomes `CANCELLED`; a full simulated refund then changes it to `REFUNDED`. Refund state is separate: `NOT_APPLICABLE`, `PENDING/PROCESSING`, `REFUNDED`, or `REFUND_FAILED`. A failed refund leaves the booking `CANCELLED`. The existing `payment.refunds` table stores one unique refund per booking. Provider and refund calls happen outside the database transactions that record each step. Repeat requests return the existing ledger result. Interrupted `PROCESSING` and `PENDING` outcomes remain durable for manual reconciliation; they must not be claimed as completed.
