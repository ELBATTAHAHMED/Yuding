# Yuding V2 — Notification Service Specification

**Date:** September 23, 2026  
**Status:** Approved & Implemented (Phase 43)  
**Target Branch:** `develop-v2`  
**Architecture Model:** Asynchronous, Durable Transactional Notifications with Idempotency & Stale Lease Recovery  

---

## 1. Executive Summary & Purpose

The **Notification Service** (`notification-service`, running on port **8085**) provides enterprise-grade, durable, and asynchronous transactional communication for the Yuding V2 travel ecosystem. It strictly owns the logical PostgreSQL schema `notification`.

### Key Architectural Pillars
1. **Durable Persistence & Outbox Worker:** Events recorded in `notification.notifications` are decoupled from provider network calls. The internal delivery worker claims batches using PostgreSQL `FOR UPDATE SKIP LOCKED` to prevent concurrent duplication across worker instances.
2. **Strict Idempotency:** Duplicate events within the same business key are deduplicated using SHA-256 idempotency key hashes and a database unique constraint `uq_notification_event_idempotency` on `(event_type, idempotency_key_hash)`.
3. **Resilient Retry & Backoff:** Bounded exponential backoff (`+1m, +5m, +15m, +1h`) for transient failures, transition to `FAILED_PERMANENT` upon non-retryable errors or maximum attempt exhaustion (5 attempts).
4. **Stale Lease Recovery:** Automatic reclamation of tasks trapped in `PROCESSING` status for over 5 minutes (due to JVM crash or worker termination), rescheduling them to `RETRY_SCHEDULED`.
5. **Provider-Neutral Abstraction:** `EmailProvider` interface decoupled from SMTP implementations. Supports `SmtpEmailProvider` (connected to local Mailpit on ports 1025/8025 in development, or real TLS SMTP in production) and `MockEmailProvider` for automated CI/CD unit and integration testing.
6. **Defense-in-Depth & Header Injection Protection:** Recipient headers and subject lines are strictly sanitized against CRLF injection (`\r\n`). Email content is rendered via versioned Thymeleaf templates with automatic HTML escaping and plain-text fallback.
7. **Gateway Isolation:** Internal notification endpoints (`/internal/notifications/**`) are strictly private and unrouted by `gateway-service`, preventing unauthorized public email trigger vectors.

---

## 2. Notification Delivery Lifecycle & State Machine

```text
                  ┌───────────────┐
                  │    PENDING    │
                  └───────┬───────┘
                          │ Worker claims record (FOR UPDATE SKIP LOCKED)
                          ▼
                  ┌───────────────┐
                  │  PROCESSING   │◄──────────────────────────┐
                  └──┬─────────┬──┘                           │
                     │         │                              │
     Provider OK     │         │ Transient Failure            │
   (HTTP 200 / SMTP) │         │ (Timeout, 5xx)               │
                     ▼         ▼                              │
         ┌──────────────┐   ┌─────────────────┐               │
         │     SENT     │   │ RETRY_SCHEDULED │───────────────┘
         └──────────────┘   └──┬──────────────┘  Lease Expiry /
                               │                 Backoff Expired
                               │ Max Attempts Exceeded (5) OR
                               │ Permanent Error (4xx, syntax)
                               ▼
                    ┌──────────────────┐
                    │ FAILED_PERMANENT │
                    └──────────────────┘
```

### Bounded Exponential Backoff Schedule
* **Attempt 1 Failure:** Next attempt in $+1\text{ minute}$
* **Attempt 2 Failure:** Next attempt in $+5\text{ minutes}$
* **Attempt 3 Failure:** Next attempt in $+15\text{ minutes}$
* **Attempt 4 Failure:** Next attempt in $+60\text{ minutes}$
* **Attempt 5 Failure:** Status transitions permanently to `FAILED_PERMANENT`.

---

## 3. Supported Notification Events

| Event Type | Owning Service | Trigger Context | Critical Truth Rule |
| :--- | :--- | :--- | :--- |
| `VERIFY_ACCOUNT` | `identity-service` | User registration | Sent with time-bounded verification token |
| `RESET_PASSWORD` | `identity-service` | Forgot password request | Sent with single-use cryptographic reset token |
| `PAYMENT_FAILED` | `reservation-service` | Payment capture denied / failed | Informs user without persisting card PAN/CVV |
| `BOOKING_CONFIRMED` | `reservation-service` | Provider confirms booking (`confirm()`) | **CRITICAL: NEVER emitted on `PAID`. Only on `BookingStatus.CONFIRMED`.** |
| `BOOKING_CANCELLED` | `reservation-service` | User or admin cancels booking | Notifies user of cancellation and refund status |
| `REFUND_COMPLETED` | `reservation-service` | Refund approved & processed | Confirms return of funds to original payment instrument |

---

## 4. Mailpit Development Setup

Mailpit is integrated into `infra/docker-compose.yml`:
* **SMTP Server:** `localhost:1025` (no authentication, no TLS required in local dev)
* **Web Inspector UI:** `http://localhost:8025`
* Docker Service:
```yaml
  mailpit:
    image: axllent/mailpit:latest
    container_name: yuding-mailpit
    restart: unless-stopped
    ports:
      - "1025:1025"
      - "8025:8025"
```

---

## 5. Security & Privacy Safeguards

1. **Zero Cardholder Data (PAN/CVV):** Notification payloads and templates never contain, transmit, or record raw credit card numbers or security codes.
2. **CRLF Injection Prevention:** Email recipients and subjects undergo strict regex and control character validation. Any attempt to inject `\r` or `\n` is rejected immediately as a permanent failure.
3. **Internal-Only Access:** The Gateway (`gateway-service.yml`) contains no route for `/internal/notifications/**`. Only intra-cluster microservices can access this port.
4. **Token Obfuscation:** Raw password reset or verification tokens are never logged in application logs.
