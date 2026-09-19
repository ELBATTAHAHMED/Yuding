# Yuding V2 — Security Baseline Specification

**Date:** September 19, 2026  
**Status:** Approved Security Baseline (Phase 9)  
**Target Branch:** `develop-v2`  
**Architecture Model:** Defense-in-Depth Microservice Security  

---

## 1. Executive Summary & Security Philosophy

Phase 9 establishes an authoritative, cross-cutting **security baseline** for the Yuding V2 microservice platform. The fundamental philosophy guiding this design is **Defense-in-Depth**:
- Security is **never** delegated solely to the API Gateway.
- Every downstream service maintains its own independent security boundary (`SecurityFilterChain`), input validation layer, error-handling sanitizer, and audit logging filter.
- If the Gateway is misconfigured or bypassed internally, downstream services continue to validate authorization, reject invalid payloads, enforce secure headers, and mask internal errors.

```text
Incoming HTTPS Request
         │
         ▼
┌────────────────────────────────────────────────────────┐
│               Spring Cloud Gateway (8888)             │
│  - Reactive WebFlux Security (ServerHttpSecurity)      │
│  - Redis-backed Rate Limiter (RequestRateLimiter)       │
│  - Strict Environment-based CORS                       │
│  - Perimeter Security Headers (CSP, HSTS, X-Frame)     │
│  - Memory & Request Buffer Caps (5MB cap, 16KB header) │
└────────────────────────┬───────────────────────────────┘
                         │ (Internal Virtual Network)
         ┌───────────────┼───────────────┬───────────────┐
         ▼               ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐ ┌─────────────┐
│  user-service   │ │reservation-serv.│ │commentaire- │ │ ai-service  │
│  (identity)     │ │   (booking)     │ │(engagement) │ │    (ai)     │
│ - SecurityFilter│ │ - SecurityFilter│ │- SecurityFil│ │- SecurityFil│
│ - BCrypt(12)    │ │ - Stateless     │ │- Stateless  │ │- Stateless  │
│ - Bean Validat. │ │ - Bean Validat. │ │- Bean Valid.│ │- Bean Valid.│
│ - Audit Filter  │ │ - Audit Filter  │ │- Audit Filt.│ │- Audit Filt.│
│ - Safe 500 Err  │ │ - Safe 500 Err  │ │- Safe 500   │ │- Safe 500   │
└─────────────────┘ └─────────────────┘ └─────────────┘ └─────────────┘
```

---

## 2. Gateway Perimeter Security Controls

The API Gateway (`backend/gateway-service`) is the primary public entry point for all external traffic.

### 2.1 Reactive Spring Security (`SecurityConfig.java`)
- Implements `SecurityWebFilterChain` using `ServerHttpSecurity`.
- **CSRF:** Disabled for stateless REST API routing.
- **Session Management:** Stateless architecture.
- **Perimeter Headers:**
  - `Content-Security-Policy`: `default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';`
  - `X-Frame-Options`: `DENY`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), payment=()`
  - `Strict-Transport-Security` (HSTS): Enabled with 1-year max age and subdomain inclusion for HTTPS deployments.

### 2.2 Redis-Backed Rate Limiting (`RateLimiterConfig.java`)
- Backed by `yuding-redis` (`redis:7-alpine`) on port `6379`.
- **Filter:** `RequestRateLimiterGatewayFilterFactory` configured in `default-filters`.
- **Key Resolver (`ipKeyResolver`):** Extracts client IP with full support for upstream reverse-proxy `X-Forwarded-For` headers.
- **Token Bucket Algorithm:**
  - `replenishRate`: 50 tokens/second per IP.
  - `burstCapacity`: 100 tokens.
- **Protection:** Mitigates brute-force attacks, credential stuffing, and volumetric DoS.

### 2.3 Strict Environment-Based CORS
- Configured dynamically via `${CORS_ALLOWED_ORIGINS}`.
- Default allowed origins: `http://localhost:3000,http://localhost:63342,http://127.0.0.1:5500`.
- **Anti-Wildcard Rule:** `*` and `null` origins are strictly forbidden in production.
- `allowCredentials`: `true`.
- Allowed headers: `Authorization`, `Content-Type`, `X-Request-Id`, `X-Requested-With`, `Accept`, `Origin`.

### 2.4 Abuse Prevention & Resource Limits
- `spring.codec.max-in-memory-size=5MB` (caps in-memory WebFlux body buffering).
- `server.max-http-request-header-size=16KB` (prevents header flood attacks).

---

## 3. Service-Level Defense-in-Depth

Every downstream service (`user-service`, `reservation-service`, `commentaire-service`, `ai-service`) implements dedicated security controls.

### 3.1 Independent Security Filter Chains (`SecurityConfig.java`)
- Every service runs `spring-boot-starter-security` with `@EnableWebSecurity` and `@EnableMethodSecurity(prePostEnabled = true)`.
- Session creation is strictly `SessionCreationPolicy.STATELESS`.
- CSRF is disabled on REST endpoints.
- Response security headers are enforced at the service level (Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy).
- Infrastructure health checks (`/actuator/health/**`, `/actuator/info`) are explicitly permitted without credentials.
- Service-level security is pre-configured to receive JWT Bearer authentication tokens in Phase 10.

### 3.2 Password Hashing Standard (`BCryptPasswordEncoder`)
- Standardized in `user-service` via `@Bean public PasswordEncoder passwordEncoder()`.
- Uses **BCrypt with cost factor 12** ($2^{12} = 4096$ key derivation rounds).
- Fully satisfies the Phase 7 database design cryptographic security requirement.

### 3.3 Jakarta Bean Validation Support
- `spring-boot-starter-validation` enabled across all services.
- DTOs and request bodies support `@NotNull`, `@NotBlank`, `@Size`, `@Email`, `@Min`, `@Max`, `@Pattern`, and nested `@Valid`.

---

## 4. Centralized Error Responses & Request Tracing

### 4.1 Safe Error Response DTO (`ErrorResponse.java`)
Standardized response payload format:
```json
{
  "requestId": "c98f9210-449e-4e4b-8e58-6932a392817a",
  "timestamp": "2026-09-19T22:15:30.123Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed for one or more fields",
  "path": "/apiu/users",
  "validationErrors": [
    {
      "field": "email",
      "message": "must be a well-formed email address"
    }
  ]
}
```

### 4.2 Global Exception Handling (`GlobalExceptionHandler.java`)
- `@RestControllerAdvice` implemented in each microservice.
- **Validation Errors:** Returns HTTP 400 with itemized field errors.
- **Access Denied:** Returns HTTP 403 Forbidden with a clear message.
- **ResponseStatusException:** Preserves specific domain status codes and reasons.
- **Internal Server Errors (500):** Masks all internal database errors, SQL syntax exceptions, and Java stack traces from the HTTP response. Emits a sanitized message:
  `"An unexpected internal error occurred. Please contact support with request ID: <requestId>"`
  while logging the full stack trace internally with the matching `requestId`.

---

## 5. Security Audit Logging & PII Redaction

### 5.1 Request Tracing & Correlation (`SecurityAuditFilter.java`)
- Implemented as a `OncePerRequestFilter` with `@Order(Ordered.HIGHEST_PRECEDENCE)`.
- Reads `X-Request-Id` from incoming request headers; if absent, generates a new `UUIDv4`.
- Binds `requestId` to SLF4J MDC (`Mapped Diagnostic Context`) and attaches `X-Request-Id` to the HTTP response header.

### 5.2 Zero Credential / PII Leakage in Logs
- **Header Redaction:** Authentication tokens (`Authorization`), cookies (`Cookie`, `Set-Cookie`), and proxy credentials are never written to logs.
- **Query Parameter Masking:** Parameters matching `password`, `pass`, `pwd`, `token`, `secret`, `cvv`, `card`, `pan`, `numcarte`, or `authorization` are automatically replaced with `[REDACTED]`.
- **Audit Format:**
  - Inbound: `[AUDIT-IN] [requestId] GET /apir/reservations from IP: 192.168.1.50`
  - Outbound: `[AUDIT-OUT] [requestId] GET /apir/reservations completed with status: 200 in 42ms`

---

## 6. Secrets Management & Environment Isolation

### 6.1 Safe Template (`.env.example`)
- Established at repository root with safe mock defaults and descriptive comments.
- Covers:
  - Database credentials (`DB_HOST`, `DB_PORT=5433`, `DB_NAME=yuding`, `DB_USERNAME`, `DB_PASSWORD`)
  - Cache credentials (`REDIS_HOST`, `REDIS_PORT=6379`, `REDIS_PASSWORD`)
  - JWT configuration (`JWT_SECRET` min 32 characters, expiration windows)
  - CORS origins (`CORS_ALLOWED_ORIGINS`)
  - OpenAI credentials (`OPENAI_API_KEY`, `OPENAI_MODEL`)
  - Payment credentials (`PAYMENT_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
  - SMTP mail credentials

### 6.2 Git Secret Protection
- `.gitignore` configured to strictly ignore:
  - `.env`
  - `.env.*` (with explicit whitelist exception `!.env.example`)
- Verification confirmed zero private keys, API secrets, or live credentials committed to Git.

---

## 7. Service Verification & Build Matrix

All backend services were re-compiled and verified clean using their dedicated Maven wrappers on Java 21:

| Service | Framework / Role | Security Controls Added | Build Status |
|---|---|---|---|
| **`gateway-service`** | Spring Cloud Gateway (WebFlux) | Reactive Security, CSP, HSTS, Redis Rate Limiter, Memory caps, CORS | **BUILD SUCCESS** |
| **`user-service`** | Spring Boot Web / Identity | Spring Security, BCrypt(12), Bean Validation, Global Exception, Audit Filter | **BUILD SUCCESS** |
| **`reservation-service`**| Spring Boot Web / Booking | Spring Security, Bean Validation, Global Exception, Audit Filter | **BUILD SUCCESS** |
| **`commentaire-service`**| Spring Boot Web / Engagement | Spring Security, Bean Validation, Global Exception, Audit Filter | **BUILD SUCCESS** |
| **`ai-service`** | Spring AI / PgVector | Spring Security, Bean Validation, Global Exception, Audit Filter | **BUILD SUCCESS** |
| **`discovery-service`** | Netflix Eureka Server | Unbroken discovery registry, internal health probes | **BUILD SUCCESS** |
| **`config-service`** | Spring Cloud Config Server | Unbroken configuration provider | **BUILD SUCCESS** |

---

## 8. Readiness for Phase 10 (Identity & JWT)

The security baseline established in Phase 9 provides the exact foundation required for Phase 10:
- `user-service` has `BCryptPasswordEncoder(12)` ready for user credential hashing.
- Downstream services have stateless `SecurityFilterChain` pipelines ready to attach the JWT Authentication Filter / Resource Server.
- Standardized `ErrorResponse` and `GlobalExceptionHandler` are ready to catch expired/invalid token exceptions.
- `SecurityAuditFilter` is operational to correlate authenticated user security actions with `requestId` and audit tables.
