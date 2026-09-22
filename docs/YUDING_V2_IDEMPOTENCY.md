# Yuding V2 — End-to-End Idempotency & Duplicate-Side-Effect Protection (Phase 41)

## 1. Architectural Overview & Threat Model

Phase 41 establishes an **authoritative end-to-end idempotency and duplicate-side-effect protection architecture** for Yuding V2. It guarantees that mutations across the booking, payment order, capture, and refund lifecycles are executed at most once, even under severe real-world failure modes.

### Addressed Threat Vectors:
1. **User Double-Clicks & Rapid UI Interaction**: User double-clicks the "Confirmer" or "Payer" button before the UI disables the trigger.
2. **Browser Retries & Page Refreshes**: User refreshes the payment page or clicks back/forward during order initiation.
3. **Network Timeouts & Dropped Packets**: The HTTP response is dropped after the server has successfully committed the database change or invoked PayPal Sandbox.
4. **Proxy & Gateway Retries**: Upstream gateways, reverse proxies, or CDNs retry failed or timed-out HTTP POST requests.
5. **Concurrent Asynchronous Mutations**: Multiple simultaneous client requests with the exact same intent arrive in parallel.
6. **Webhook Replays & Provider Re-deliveries**: PayPal Sandbox re-sends `PAYMENT.CAPTURE.COMPLETED` or `PAYMENT.CAPTURE.DENIED` events multiple times.

```
+--------------------------------------------------------------------------------------------------------+
|                                        Frontend Web (Next.js)                                          |
|  - Generates crypto.randomUUID() once per logical user intent (Booking / Create-Order / Capture)       |
|  - Reuses stable key across automatic retries, network errors, and manual re-submissions               |
|  - Re-generates key only upon explicit new user intent (modal dismissal, new search selection)          |
+--------------------------------------------------------------------------------------------------------+
                                                    |
                                                    | Inbound HTTP Header: Idempotency-Key: <UUID>
                                                    v
+--------------------------------------------------------------------------------------------------------+
|                                API Gateway & reservation-service Layer                                 |
|  - Validates header (non-empty, <=255 chars, printable ASCII) -> 400 IDEMPOTENCY_KEY_REQUIRED/INVALID  |
|  - IdempotencyHasher: SHA-256(Idempotency-Key) & SHA-256(Canonical Request Fingerprint)                |
+--------------------------------------------------------------------------------------------------------+
                                                    |
                                                    v
+--------------------------------------------------------------------------------------------------------+
|                                    IdempotencyService (Coordinator)                                    |
|                                                                                                        |
|   1. Claim Phase [REQUIRES_NEW Transaction]:                                                           |
|      - INSERT into booking.idempotency_records (status: IN_PROGRESS)                                    |
|      - If unique constraint violation (uq_idempotency_scope):                                          |
|          - If existing status == COMPLETED & request_hash matches:                                     |
|              -> REPLAY cached response + HTTP Status + Header 'Idempotent-Replayed: true'              |
|          - If existing status == COMPLETED & request_hash MISMATCH:                                    |
|              -> REJECT with HTTP 409 (IDEMPOTENCY_KEY_REUSED)                                          |
|          - If existing status == IN_PROGRESS:                                                          |
|              -> Bounded polling & backoff; replays once winner completes                               |
|                                                                                                        |
|   2. Execution Phase [Main Transaction - Independent of Claim]:                                       |
|      - Execute domain logic (Booking creation, payment order creation, capture, etc.)                  |
|      - Database locks are NEVER held across outbound third-party HTTP calls                            |
|                                                                                                        |
|   3. Completion Phase [REQUIRES_NEW Transaction]:                                                      |
|      - UPDATE booking.idempotency_records SET status=COMPLETED, response_payload=JSONB, completed_at=now|
+--------------------------------------------------------------------------------------------------------+
                                                    |
                                                    | Outbound Mutation (PayPal Sandbox)
                                                    v
+--------------------------------------------------------------------------------------------------------+
|                                  Outbound Provider Idempotency Layer                                   |
|  - Propagates stable PayPal-Request-Id header:                                                         |
|      * Order Creation: ORD-PAY-XXXXXXXX                                                                |
|      * Capture Execution: CAP-PAY-XXXXXXXX                                                             |
|      * Refund Execution: REF-PAY-XXXXXXXX                                                              |
|  - PayPal Sandbox deduplicates upstream orders and captures preventing double-charges                   |
+--------------------------------------------------------------------------------------------------------+
```

---

## 2. Database Schema & Flyway Migration (V21)

All idempotency and deduplication metadata is managed under Flyway migration `V21__idempotency_records.sql`.

### 2.1 Table: `booking.idempotency_records`
```sql
CREATE TABLE booking.idempotency_records (
    id UUID PRIMARY KEY,
    actor_user_id UUID,
    operation VARCHAR(50) NOT NULL,
    resource_scope VARCHAR(255),
    idempotency_key_hash VARCHAR(64) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL,
    resource_type VARCHAR(50),
    resource_reference VARCHAR(50),
    http_status INT,
    response_payload JSONB,
    response_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    version INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_idempotency_scope UNIQUE (actor_user_id, operation, idempotency_key_hash)
);
```

### 2.2 Payment Deduplication Indexes
To protect against concurrent race conditions creating duplicate payment rows for the same third-party order or capture:
```sql
ALTER TABLE payment.payments ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_order 
    ON payment.payments (provider_name, provider_order_id) 
    WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_provider_transaction 
    ON payment.payments (provider_name, provider_transaction_id) 
    WHERE provider_transaction_id IS NOT NULL;
```

---

## 3. Transactional Design & Concurrency Safety

### 3.1 Isolation of Database Transactions from Third-Party I/O
A critical security rule of Yuding V2 is:
> Database transactions and row locks must NEVER be held while making outbound HTTP requests to external APIs (e.g. PayPal Sandbox).

`IdempotencyService` guarantees this via three isolated phases:
1. `claimExecution`: Uses `Propagation.REQUIRES_NEW` to claim execution rights in `booking.idempotency_records`. Commits immediately.
2. `supplier.get()`: Executes the business operation (e.g. HTTP call to `https://api-m.sandbox.paypal.com/v2/checkout/orders`).
3. `completeExecution`: Uses `Propagation.REQUIRES_NEW` to update `booking.idempotency_records` with status `COMPLETED` and the serialized JSON response payload. Commits immediately.

### 3.2 Concurrent Race Resolution
When two identical requests arrive simultaneously:
1. Both attempt to insert the `IN_PROGRESS` record.
2. One thread wins and commits the claim.
3. The losing thread encounters a unique constraint violation (`uq_idempotency_scope`).
4. The losing thread enters a bounded polling loop (with backoff), awaiting the winner's completion.
5. Once completed, the loser deserializes and replays the winner's response payload without re-executing any business logic or outbound provider mutations.

---

## 4. Request Fingerprinting & Conflict Rejection

`IdempotencyHasher` generates a deterministic SHA-256 fingerprint from:
- `operation`: e.g. `BOOKING_CREATE`, `PAYMENT_CREATE`, `PAYMENT_CAPTURE`
- `actorUserId`: Authenticated user UUID
- `resourceScope`: Associated parent resource reference (e.g. `bookingReference`)
- `requestPayload`: Canonical JSON serialization of request DTO properties

If an incoming request presents an `Idempotency-Key` that matches an existing record but has a differing request fingerprint, the request is immediately rejected with:
- **HTTP 409 Conflict**
- `error: "IDEMPOTENCY_KEY_REUSED"`
- `message: "This Idempotency-Key has already been used with different request parameters."`

---

## 5. Client Contract & Observable Replay Header

### Inbound Header:
- `Idempotency-Key: <client-generated-uuid>`
- Required on mutations: `POST /bookings`, `POST /bookings/{ref}/payment/create-order`, `POST /bookings/{ref}/payment/capture`.

### Replay Observability:
When an idempotency hit is replayed from storage:
- HTTP Status is restored (e.g. `201 Created` or `200 OK`).
- Exact original JSON response payload is returned.
- HTTP Response Header `Idempotent-Replayed: true` is attached.

---

## 6. Outbound Provider Idempotency (`PayPal-Request-Id`)

To protect upstream third-party systems from duplicate charges:
1. **Order Initiation**:
   - `PayPalSandboxPaymentProvider` transmits `PayPal-Request-Id: ORD-PAY-XXXXXXXX`.
   - Re-running order creation with the same internal payment reference produces the identical PayPal order without creating a duplicate PayPal transaction.
2. **Order Capture**:
   - `PayPalSandboxPaymentProvider` transmits `PayPal-Request-Id: CAP-PAY-XXXXXXXX`.
   - Duplicate capture calls are safely deduplicated by PayPal.
3. **Refund Execution**:
   - `PaymentProvider.refundPayment` receives `PaymentRefundCommand` with `providerRequestId: REF-PAY-XXXXXXXX`.
   - Transmits `PayPal-Request-Id: REF-PAY-XXXXXXXX` to PayPal Sandbox refund endpoint `/v2/payments/captures/{capture_id}/refund`.

---

## 7. Webhook Idempotency Separation

Webhooks from payment providers (e.g. PayPal Sandbox) **do not** require client-supplied `Idempotency-Key` headers.
Instead, webhooks are protected by the Phase 40 deduplication architecture:
- Authoritative table `payment.webhook_events` stores `provider_name` and `provider_event_id`.
- Natural provider uniqueness constraint `uq_webhook_events_provider_event (provider_name, provider_event_id)` ensures duplicate deliveries are acknowledged with HTTP 200 `DUPLICATE` without re-transitioning booking states.

---

## 8. Verification Debt & Safety Status

- **Verification Debt Status**:
  > **Note**: Per Rule 80, verification of *real inbound HTTPS PayPal Sandbox webhook delivery* remains pending in local development (requiring public TLS webhook ingress or sandbox simulation). Phase 41 has verified the full unit, integration, and concurrency contracts under mock and automated sandbox conditions.
- **Real Money Guard**: Zero real money moved; PayPal Sandbox and mock providers only.
- **Pricing Authority**: Phase 37 server pricing quotes remain strictly authoritative.
- **Card Security**: Phase 39 zero-PAN/CVV storage baseline remains intact.
