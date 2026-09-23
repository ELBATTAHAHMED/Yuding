# Yuding V2 — Production Routing & Strict CORS Architecture

This document specifies the browser-facing edge routing contract, `/api/*` prefix stripping, Gateway internal routing, centralized strict CORS allowlists, same-origin cookie security, and frontend environment integration for Yuding V2.

---

## 1. Edge Routing Contract & Traffic Topography

### 1.1 Architectural Overview
In development, the browser may contact `http://localhost:8888` directly. In production and staging, browser API communication is strictly **same-origin**:

```text
Browser Client
   │
   ├── [Page Navigation & Assets]  ──────> https://<DOMAIN>/*
   │                                           │
   │                                    Reverse Proxy (Nginx)
   │                                           │
   │                                           ▼
   │                                    Next.js Web Frontend (:3000)
   │
   └── [API Traffic]               ──────> https://<DOMAIN>/api/*
                                               │
                                        Reverse Proxy (Nginx)
                                               │ (strips '/api')
                                               ▼
                                        API Gateway (:8888)
                                               │
                                       ┌───────┼───────┬───────┐
                                       ▼       ▼       ▼       ▼
                                     Auth   Travel  Review    AI
```

### 1.2 Edge Prefix Stripping Contract
The edge reverse proxy (`infra/reverse-proxy/nginx.conf`) terminates external requests and strips the public `/api` prefix before passing the traffic internally to `gateway-service` on port `8888`:

| Public Browser Endpoint | Edge Proxy Action | Internal Gateway Route | Downstream Microservice |
| :--- | :--- | :--- | :--- |
| `POST /api/auth/login` | Strip `/api` | `POST /auth/login` | `identity-service:8081` |
| `POST /api/auth/refresh` | Strip `/api` | `POST /auth/refresh` | `identity-service:8081` |
| `GET /api/auth/me` | Strip `/api` | `GET /auth/me` | `identity-service:8081` |
| `GET /api/admin/users` | Strip `/api` | `GET /admin/users` | `identity-service:8081` |
| `GET /api/apir/reservations/me`| Strip `/api` | `GET /apir/reservations/me` | `reservation-service:8090` |
| `GET /api/apic/commentaires` | Strip `/api` | `GET /apic/commentaires` | `commentaire-service:8072` |
| `POST /api/ai/chat` | Strip `/api` | `POST /ai/chat` | `ai-service:7777` |

> [!IMPORTANT]
> Gateway route definitions in `gateway-service` do NOT include `/api`. The `/api` prefix belongs exclusively to the public edge reverse proxy. Gateway route predicates remain `/auth/**`, `/admin/**`, `/apir/**`, `/apic/**`, and `/ai/**`.

### 1.3 Next.js Route Preservation & Browser Refresh
All non-`/api` requests pass directly to the Next.js App Router:
- `/`, `/login`, `/register`, `/hotels`, `/flights`, `/activities`, `/transfers`
- Dynamic routes: `/booking/*`, `/account/*`, `/admin/*`
Direct browser refresh (`F5` or URL entry) operates cleanly without 404s because the reverse proxy passes all non-API paths directly to Next.js (`proxy_intercept_errors off`).

---

## 2. Centralized, Strict CORS Architecture

### 2.1 Perimeter Security (`CorsConfig.java` & `SecurityConfig.java`)
CORS is enforced at the Gateway perimeter via a reactive `CorsConfigurationSource` bean synchronized with Spring Security WebFlux and Spring Cloud Gateway:

```java
@Bean
public CorsConfigurationSource corsConfigurationSource(
        @Value("${CORS_ALLOWED_ORIGINS:...}") String allowedOriginsRaw) {
    CorsConfiguration config = new CorsConfiguration();
    List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
            .map(String::trim)
            .filter(s -> !s.isEmpty() && !s.equals("*") && !s.equalsIgnoreCase("null"))
            .collect(Collectors.toList());
    config.setAllowedOrigins(origins);
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    config.setAllowedHeaders(List.of(
            "Authorization", "Content-Type", "Accept", "X-Request-Id", "X-Correlation-Id", "X-Requested-With", "Origin", "Idempotency-Key"
    ));
    config.setExposedHeaders(List.of("X-Request-Id", "X-Correlation-Id", "Idempotent-Replayed"));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);
    ...
}
```

### 2.2 Environment Allowlist Matrix

| Profile | Allowed Origins Default | Credentials | Wildcard `*` | Origin `null` |
| :--- | :--- | :--- | :--- | :--- |
| **Development** (`dev`) | `http://localhost:3000, http://localhost:63342, http://127.0.0.1:5500` | Supported (`true`) | Forbidden | Forbidden |
| **Staging** (`staging`)| `https://staging.yuding.travel` (or `${CORS_ALLOWED_ORIGINS}`) | Supported (`true`) | Forbidden | Forbidden |
| **Production** (`prod`) | `${CORS_ALLOWED_ORIGINS}` (Fail-fast if unconfigured) | Supported (`true`) | Forbidden | Forbidden |

### 2.3 Strict Security Rules
1. **Never Allow `*` with Credentials:** Cross-origin credentialed requests (cookies/authorization) with `*` are rejected.
2. **Never Allow `null` Origin:** Sandboxed iframes, local file drops, or spoofed `Origin: null` headers are rejected.
3. **Exposed Headers:** `X-Request-Id` and `X-Correlation-Id` are explicitly exposed so client logging can track requests end-to-end.
4. **OPTIONS Preflight:** Handled directly at the perimeter with 200 OK and cached for 3600 seconds (`maxAge`).

---

## 3. Frontend Environment Resolution (`frontend/web/`)

### 3.1 Environment Resolution Engine (`src/lib/env.ts`)
The web application resolves its API base URL deterministically:

```typescript
export function resolveApiBaseUrl(appEnv: AppEnvironment, explicitUrlValue?: string): string {
  const rawUrl = (explicitUrlValue ?? process.env.NEXT_PUBLIC_API_BASE_URL)?.trim();

  if (rawUrl) {
    if ((appEnv === 'production' || appEnv === 'staging') &&
        (rawUrl.includes('localhost') || rawUrl.includes('127.0.0.1'))) {
      throw new Error(`[Security Violation] Insecure localhost API base URL "${rawUrl}" is forbidden in ${appEnv}.`);
    }
    return rawUrl.replace(/\/+$/, '');
  }

  if (appEnv === 'production' || appEnv === 'staging') {
    return '/api';
  }

  return 'http://localhost:8888';
}
```

### 3.2 Bundle Hygiene & Next.js Rewrites (`next.config.js`)
- **Zero Localhost In Production Bundles:** The hardcoded `localhost:8888` fallback has been completely removed from `next.config.js`.
- **Local Development Parity:** `next.config.js` defines rewrites mapping `/api/:path*` to `${GATEWAY_INTERNAL_URL || 'http://localhost:8888'}/:path*`, allowing local Next.js developers to test `/api/*` same-origin workflows without running Nginx locally.

---

## 4. Auth & Cookie Security

In production same-origin routing (`https://<DOMAIN>/api/auth/...`), refresh cookies are strictly first-party:
- `httpOnly: true` (inaccessible to browser JavaScript / XSS).
- `secure: true` in staging and production (enforced via `cookie.secure=true`).
- `sameSite: Strict` (eliminates CSRF cross-origin leakage).
- `path: /` (available across all subpaths).

---

## 5. Security Headers & CSP

Gateway and Edge Proxy apply defense-in-depth headers:
- `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';` (inherently permits same-origin `/api` calls).
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

---

## 6. Required Environment Variables

| Variable | Environment | Example / Default | Description |
| :--- | :--- | :--- | :--- |
| `CORS_ALLOWED_ORIGINS` | `prod` | `https://yuding.travel` | Comma-separated list of approved web origins. |
| `CORS_ALLOWED_ORIGINS` | `staging` | `https://staging.yuding.travel` | Staging approved web origins. |
| `NEXT_PUBLIC_APP_ENV` | All | `production` / `staging` / `development` | Informs Next.js client of the target deployment mode. |
| `NEXT_PUBLIC_API_BASE_URL` | Optional | `/api` | Public base path (defaults to `/api` in prod/staging). |
| `GATEWAY_INTERNAL_URL` | Next.js Dev | `http://localhost:8888` | Internal Gateway destination for Next.js rewrites. |

---

## 7. Relation to Future Phase 74 (Production Deployment)

Phase 19 defines the routing contract, edge configuration (`infra/reverse-proxy/nginx.conf`), and Gateway CORS perimeter. Phase 74 will build upon this foundation by adding:
- Automated SSL/TLS certificate provisioning (Let's Encrypt / Certbot).
- Multi-region DNS configuration.
- Production container orchestration (Docker Swarm / Kubernetes manifests).
- Edge CDN caching for static Next.js assets (`/_next/static/*`).
