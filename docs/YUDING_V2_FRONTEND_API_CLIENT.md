# Yuding V2 — Central Frontend API Client

This document defines the architecture, transport conventions, error handling, session lifecycle, and retry policies for the central frontend API client located at `frontend/web/src/lib/api-client.ts` (with service-level re-export at `frontend/web/src/services/api-client.ts`).

---

## 1. Architectural Responsibilities

The central `ApiClient` is the single authoritative transport layer for all backend communications between the Next.js web application and the Yuding backend ecosystem.

- **Gateway as Single Ingress:** All API traffic routes exclusively through `gateway-service` on port `8888`. No frontend code contacts downstream microservices directly (ports 8081, 8082, 8084, 8090, 8072, 7777 are strictly forbidden).
- **Separation of Concerns:**
  - `apiClient`: Transport security, token injection, timeout aborts, normalized error formatting, request correlation, single-flight refresh, and safe retry execution.
  - Domain Services (`auth.service`, `booking.service`, `travel.service`, `admin.service`): Domain DTOs, endpoint paths, and business operations.

---

## 2. Base URL Strategy & Gateway Contract

- **Environment Variable:** `NEXT_PUBLIC_API_BASE_URL` specifies the Gateway origin.
- **Default Fallback:** `http://localhost:8888` (for local development).
- **No Global Prefix:** The client does **not** inject a blanket `/api` prefix. The Gateway routes traffic based on discrete top-level path segments:
  - `/auth/**` -> `identity-service` (port 8081)
  - `/admin/**` -> `identity-service` & administrative controllers
  - `/apir/**` -> `travel-service` / reservation APIs
  - `/apic/**` -> `commentaire-service` / reviews
  - `/ai/**` -> `ai-service` / travel agent AI

---

## 3. Authentication & Single-Flight Token Refresh

```
[401 Encountered] ──> Is refresh in flight?
                           ├── Yes ──> Await existing refresh Promise (Shared)
                           └── No  ──> Initiate single-flight POST /auth/refresh
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
                   [Success]                                   [Failed]
             Save new accessToken in memory              Clear accessToken from memory
             Retry original request ONCE                 Throw clean 401 ApiError
             (isRetry: true prevents loops)              (Never infinite loop)
```

1. **Token Security:**
   - Access tokens reside **strictly in memory** (never written to `localStorage` or `sessionStorage`).
   - Refresh tokens are transmitted as **HttpOnly cookies** via `credentials: 'include'`. The client JavaScript never accesses raw refresh tokens.
2. **Single-Flight Mechanism:**
   - When multiple concurrent requests encounter a `401 Unauthorized` on authenticated endpoints, only **one** `/auth/refresh` request is initiated.
   - All pending requests wait on the same shared refresh Promise.
   - Upon successful refresh, each request retries its call exactly once with the new Bearer token.
3. **Loop Prevention:**
   - Retried requests include `isRetry: true`. If a retried request still returns `401`, it is immediately rejected without triggering another refresh cycle.
   - Refresh attempts on `/auth/login` and `/auth/refresh` are rejected immediately to prevent recursion.

---

## 4. Timeout Handling via `AbortController`

- **Default Timeout:** 15,000ms (15 seconds).
- **Per-Request Override:** Callers can pass `timeoutMs` in `RequestOptions`.
- **Abort Mechanics:** Employs native `AbortController` with automatic timer cleanup. Chained with any user-provided `AbortSignal`.
- **Diagnostic Distinction:** When a timeout fires, `ApiClient` maps the abort event to an `ApiError` with:
  - `isTimeout = true`
  - `status = 0`
  - `errorCode = 'REQUEST_TIMEOUT'`
  - Informative message: `Request timed out after <N>ms`.

---

## 5. Conservative Retry Policy

Retries are conservative and idempotency-aware:

1. **Safe Methods Only:** Automatic retries are permitted **only** for safe, idempotent HTTP methods (`GET`, `HEAD`, `OPTIONS`) or when `options.retryable: true` is explicitly provided.
2. **Mutating Methods Protected:** `POST`, `PUT`, `PATCH`, and `DELETE` requests are **never** automatically retried by default, avoiding duplicate payments or duplicate bookings.
3. **Transient Failures Only:**
   - Network unreachable / connection refused errors (`isNetwork = true`).
   - Transient Gateway HTTP statuses: `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`.
4. **Never Retried:**
   - Client errors: `400 Bad Request`, `401 Unauthorized` (handled separately by the auth refresh flow), `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity`.
   - Business or validation failures.
5. **Bounded Backoff:** Exponential backoff with linear growth `min(attempt * retryDelayMs, 2000ms)` and max 2 retries.

---

## 6. Typed Normalized Error Model (`ApiError`)

All network, transport, and backend failures are normalized into the typed `ApiError` class:

```typescript
export interface ApiErrorDetails {
  message: string;
  status: number;                     // 0 for network/timeout; HTTP status code for backend errors
  errorCode?: string;                 // e.g., 'VALIDATION_FAILED', 'USER_LOCKED', 'REQUEST_TIMEOUT'
  requestId?: string;                 // Correlation ID from X-Request-Id or X-Correlation-Id
  validationErrors?: Record<string, string[]> | any; // Form field validation map
  isTimeout?: boolean;                // True if aborted due to timeout
  isNetwork?: boolean;                // True if network unreachable/offline
  isAuthError?: boolean;              // True for 401 or 403 status
  data?: any;                         // Full parsed backend error body
}
```

Components and services consume standardized fields rather than implementing disparate parsing logic.

---

## 7. Request Correlation & IDs

- **Outbound:** When `options.requestId` is supplied, `ApiClient` sets the `X-Correlation-Id` header.
- **Inbound:** Automatically inspects incoming response headers (`X-Request-Id`, `X-Correlation-Id`, `x-request-id`, `x-correlation-id`) and attaches the ID to `ApiError` instances and logging contexts.

---

## 8. Service-Layer Integration Example

```typescript
import { apiClient } from '@/lib/api-client';
import { FlightOffer } from '@/types/travel.types';

export const travelService = {
  async searchFlights(origin: string, destination: string): Promise<FlightOffer[]> {
    return apiClient.post<FlightOffer[]>(
      '/apir/transports/search1',
      { pays: origin, destination },
      false, // requiresAuth
      { timeoutMs: 10000 } // optional custom timeout
    );
  },
};
```
