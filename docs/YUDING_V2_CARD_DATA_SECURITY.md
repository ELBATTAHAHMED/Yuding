# Yuding V2 — Card Data Security & Zero Card Ownership Architecture (Phase 39)

## 1. Executive Summary & Security Baseline

Phase 39 establishes an absolute architectural constraint for Yuding V2: **The Yuding application has ZERO ownership of raw card credentials**.

Under no circumstances does Yuding receive, process, serialize, store, or log:
- Full Primary Account Number (PAN / Card Number)
- Card Verification Value (CVV / CVC / Security Code)
- Card expiration date as a payment credential

All payment processing relies strictly on **provider-hosted fields, provider-hosted checkout, and provider tokenization**. Yuding interacts exclusively with non-sensitive provider identifiers (`providerOrderId`, `providerTransactionId`, `paymentReference`).

---

## 2. The Card-Data Boundary & Zero-Ownership Principle

### 2.1 Why Yuding Does Not Own PAN / CVV
Owning or processing raw card data places an application directly in the high-risk scope of PCI-DSS (requiring SAQ D, annual audits, strict network isolation, and cryptographic key management). By completely eliminating the transmission, processing, and storage of cardholder data:
1. **Zero Attack Surface for Card Theft:** Even in the event of an application or database compromise, no card numbers or CVVs exist to be exfiltrated.
2. **Reduced Compliance Scope:** The application falls into the lowest compliance exposure (SAQ A / SAQ A-EP), as customer payment credentials never touch Yuding infrastructure.
3. **Defense in Depth:** Even malicious clients attempting to inject card secrets are rejected at the edge before any internal processing occurs.

### 2.2 System Boundary Diagram
```
+---------------------------------------------------------------------------------+
| Browser (User Interface)                                                        |
|                                                                                 |
|  [Decorative Card Art]               [Provider-Hosted Boundary]                 |
|   • Masked digits (•••• •••• ••••)    • Provider Secure Iframe / SDK (PayPal)   |
|   • Static expiry (••/••)            • User enters card data directly into     |
|   • Static CVC (•••)                   provider infrastructure                  |
|   • Purely visual skin               • Direct TLS to provider (api.paypal.com) |
+---------------------------------------------------------------------------------+
                                       |
                   Direct Tokenization / Approval Flow
                                       v
                     +-----------------------------------+
                     | Authorized PSP (e.g. PayPal)      |
                     | Issues: providerOrderId / tokens  |
                     +-----------------------------------+
                                       |
                   Non-sensitive provider order identifier
                                       v
+---------------------------------------------------------------------------------+
| API Gateway (8888) -> Reservation Service (8090)                                |
|                                                                                 |
|   PaymentCaptureRequestDto:                                                     |
|     - paymentReference (PAY-XXXXXXXX)                                           |
|     - providerOrderId (e.g. 5O190127TN364715T)                                  |
|                                                                                 |
|   Defense-in-Depth Filter:                                                      |
|     - Unknown / forbidden properties (cardNumber, pan, cvv, expiry)             |
|       REJECTED with HTTP 400 Bad Request                                        |
+---------------------------------------------------------------------------------+
                                       |
                                       v
+---------------------------------------------------------------------------------+
| PostgreSQL 16 `payment.payments`                                                |
|   - payment_reference, provider_order_id, provider_transaction_id               |
|   - status (SUCCEEDED / FAILED), amount, currency                               |
|   - ZERO card columns (no pan, no cvv, no expiry)                               |
+---------------------------------------------------------------------------------+
```

---

## 3. Frontend Architecture (`frontend/web/`)

### 3.1 Removal of Raw Card Inputs & React State
All historical raw input fields and associated state hooks have been permanently removed from `PaymentForm.tsx`:
- `cardNumber` state, input element, and input formatting removed.
- `expiry` state, input element, and formatting removed.
- `cvv` state and input element removed.
- `saveCard` state and checkbox removed.
- Client-side BIN/IIN parsing (`startsWith('4')`, `5[1-5]`) deleted.

### 3.2 Decorative Card Component (`CardPreview.tsx`)
The animated 3D credit card component is strictly decorative:
- Accepts only safe props: `cardHolder?: string`, `last4?: string`, `isFlipped?: boolean`, `brand: 'visa' | 'mastercard'`, `onToggleFlip?: () => void`.
- **Card Number:** Displays permanently masked groups `•••• •••• •••• ••••` (or optionally `•••• •••• •••• ${last4}` only if safely provided by provider metadata).
- **Expiry Date:** Displays static `••/••`.
- **CVC:** Displays static `•••` on the magnetic strip reverse.
- Card scheme styling (Visa purple gradient vs. Mastercard deep slate) is driven strictly by explicit UI button selection, with zero payment processing authority.

### 3.3 Provider Eligibility & Honest Fallback
When direct card entry is selected, Yuding evaluates provider eligibility:
- If hosted fields are not configured or eligible on the active sandbox account, the UI presents a truthful notice:
  > *"Le paiement direct par carte n'est pas disponible pour ce compte sandbox. Conformément aux normes de sécurité, Yuding ne reçoit, ne traite et ne stocke aucun numéro complet de carte bancaire (PAN), cryptogramme (CVC) ni date d'expiration."*
- A prominent action allows the user to switch seamlessly to PayPal Sandbox checkout.
- No fake card forms or simulated card numbers are ever presented.

### 3.4 Browser Storage Audit
- Neither `localStorage` nor `sessionStorage` contains payment card credentials.
- No card numbers, expiration dates, or CVVs are ever written to browser storage or client cookies.

---

## 4. Backend & API Contract (`reservation-service`)

### 4.1 Payment Endpoint Contracts
All public payment endpoints require RS256 JWT authentication and operate exclusively with non-sensitive identifiers:

1. **`POST /bookings/{reference}/payment/create-order`**
   - **Query Parameters:** `returnUrl` (URL), `cancelUrl` (URL)
   - **Request Body:** None (HTTP 204 or empty body)
   - **Pricing Authority:** Phase 37 `ServerPricingQuote` linked to booking revalidation. Frontend cannot pass or influence payment amount.
   - **Response Body:** `PaymentOrderResponseDto` containing `paymentReference`, `providerName`, `providerOrderId`, `amount`, `currency`, `status`, `approvalUrl`.

2. **`POST /bookings/{reference}/payment/capture`**
   - **Request Body:** `PaymentCaptureRequestDto`
     ```json
     {
       "paymentReference": "PAY-XXXXXXXX",
       "providerOrderId": "ORDER-ID-FROM-PROVIDER"
     }
     ```
   - **Forbidden Fields:** Any request containing `cardNumber`, `pan`, `cvv`, `cvc`, `securityCode`, or `expiry` is rejected with `HTTP 400 Bad Request`.
   - **Response Body:** `PaymentCaptureResponseDto` containing `bookingReference`, `paymentReference`, `providerTransactionId`, `paymentStatus`, `bookingStatus`, `amount`, `currency`, `message`.

### 4.2 Jackson Strict Deserialization & Defense-in-Depth
`PaymentCaptureRequestDto` implements strict rejection of undeclared properties:
```java
@JsonIgnoreProperties(ignoreUnknown = false)
public class PaymentCaptureRequestDto {
    private String paymentReference;
    private String providerOrderId;

    @JsonAnySetter
    public void handleUnknownProperty(String name, Object value) {
        throw new IllegalArgumentException("Forbidden or unrecognized property provided: " + name);
    }
}
```
Any attempt to supply sensitive card fields causes Jackson to abort parsing, triggering `HttpMessageNotReadableException`, which `GlobalExceptionHandler` maps to HTTP 400 with a sanitized error message.

### 4.3 PaymentProvider Abstraction
The `PaymentProvider` interface remains provider-neutral:
- `createPaymentOrder(PaymentOrderCommand command)`
- `capturePaymentOrder(PaymentCaptureCommand command)`
- Neither command contains raw card credentials.

---

## 5. Database Schema & Logging Boundary

### 5.1 Database Schema (`payment.payments`)
Auditing PostgreSQL 16 schema `payment` confirms zero card credential storage:
- `id` (UUID PK)
- `booking_id` (UUID FK)
- `payment_reference` (VARCHAR(16) UNIQUE, e.g. `PAY-XXXXXXXX`)
- `provider_name` (VARCHAR(64), e.g. `paypal_sandbox`, `mock`)
- `provider_order_id` (VARCHAR(128))
- `provider_transaction_id` (VARCHAR(128))
- `amount` (NUMERIC(12,2))
- `currency` (VARCHAR(3))
- `status` (VARCHAR(32))
- `pricing_quote_id` (UUID FK)
- `approval_url` (TEXT)
- `client_token` (TEXT, safe public client token)
- `error_message` (TEXT)
- `version` (INT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**No DDL Migration Required:** The database schema has never possessed card number, CVV, or card expiration columns. Applied migrations `V1` through `V19` remain intact.

### 5.2 Logging Sanitation
- Application logging across controllers, services, and audit filters (`SecurityAuditFilter`) logs only safe identifiers: `bookingReference`, `paymentReference`, `providerName`, `providerOrderId`, `amount`, `currency`, and `durationMs`.
- Error handlers sanitize exceptions and never echo submitted request values.
- OAuth Client Secrets (`PAYPAL_CLIENT_SECRET`) and access tokens are strictly excluded from logs.

---

## 6. Saved Cards Policy

Yuding does not implement raw card storage or simulated card saving:
- The historical checkbox *"Enregistrer cette carte pour mes prochains voyages"* has been deleted.
- Saved payment methods will be evaluated in future roadmap phases only if supported via reusable provider payment-method tokens (Vault / Customer IDs) with zero Yuding-held card secrets.

---

## 7. Verification Evidence & Runtime Network Audit

### 7.1 Automated Backend Tests
- `PaymentControllerSecurityTest.capturePaymentRejectsForbiddenCardCredentials()`: Proves that payloads containing `cardNumber` or `cvv` are rejected with HTTP 400 Bad Request.
- Full `reservation-service` suite: 153 tests passed (0 failures, 0 errors).

### 7.2 Automated Frontend Tests
- `payment.test.ts`: Proves zero raw card inputs/states in `PaymentForm`, zero sensitive props in `CardPreview`, zero card credential fields in TypeScript DTOs, and server-authoritative amount display.
- Full `frontend/web` suite: 120 tests passed across 39 suites (0 failures).

### 7.3 End-to-End Runtime Audit
Executed against live API Gateway (`http://localhost:8888`):
1. **Authentication:** User authenticated with RS256 JWT.
2. **Pricing Quote:** Validated server-authoritative quote of 192.00 EUR for booking `YUD-W7QKV3AT`.
3. **Malicious Injection:** Sent payload with `cardNumber: "4242424242424242"` and `cvv: "999"`. Received `HTTP 400 Bad Request` (`Forbidden or unrecognized property provided: cardNumber`).
4. **Order Creation:** `POST /bookings/YUD-W7QKV3AT/payment/create-order` returned `paymentReference: "PAY-XPVLEFAA"`, `providerOrderId: "MOCK-ORDER-4B250BCF"`.
5. **Capture:** `POST /bookings/YUD-W7QKV3AT/payment/capture` with only safe identifiers succeeded (`paymentStatus: "SUCCEEDED"`).
6. **Booking Status:** Verified final booking state transitioned to `PAID`.
7. **Database Audit:** Inspected row `PAY-XPVLEFAA` in `payment.payments` — confirmed zero card secrets stored.
8. **Log Audit:** Inspected `reservation-service` log — confirmed zero card numbers or CVV values logged.

---

## 8. Phase 40 Boundary

Phase 39 is strictly confined to removing raw card handling.
- **Asynchronous payment webhooks** belong strictly to **Phase 40** and are not implemented here.
- Synchronous capture and verification remain the authoritative mechanism for Phase 39.
