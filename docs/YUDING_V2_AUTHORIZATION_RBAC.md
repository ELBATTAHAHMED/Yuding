# Yuding V2 — Authorization & Role-Based Access Control (RBAC) Specification

## 1. Overview & Security Objectives

In Yuding V2, authorization is implemented using a **defense-in-depth architecture**. Authorization is enforced both at the **API Gateway perimeter** and **independently within downstream microservices**.

### Key Principles:
1. **Zero-Trust Network Perimeter**: Client-asserted headers (such as `X-User-Id`, `X-User-Roles`, `X-User-Email`) are considered untrusted and potentially spoofed. The API Gateway explicitly strips all client-supplied identity headers before routing requests downstream.
2. **Cryptographic Token Verification**: Downstream services independently validate RS256 JWT tokens using the public key (`certs/public.pem`) and construct their own authenticated Spring Security context.
3. **Elimination of Insecure Direct Object References (IDOR)**: Resource ownership is verified server-side using the authenticated user identity (`sub` claim in the JWT). Endpoints adopt the `/me` pattern or enforce server-side ownership validations (`currentUserId == resource.ownerId || hasRole('ADMIN')`).
4. **Strict Server-Side RBAC**: Role privileges are verified at both the route level and method level using Spring Security's `@PreAuthorize` annotations.
5. **Auditing of Privileged Actions**: All administrative and support actions are recorded in the `audit.admin_actions` and `audit.security_events` database tables.

---

## 2. Role Taxonomy & Matrix

Yuding V2 defines four logical roles seeded in `identity.roles` via Flyway migrations (`V2` and `V11`):

| Role | Flyway Seed | Scope & Responsibilities |
|---|---|---|
| `ROLE_USER` | `V2__create_identity.sql` | Standard authenticated traveler. Can manage own profile, create and view own bookings, initiate own payments, and manage own reviews/comments. |
| `ROLE_ADMIN` | `V2__create_identity.sql` | Superuser / System Administrator. Can manage user roles, account lock/unlock status, user deletion, manage travel inventory, delete abusive comments, and override resource management with full audit logging. |
| `ROLE_SUPPORT` | `V2__create_identity.sql` | Customer Support Specialist. Read-only inspection of user profiles, bookings, and payments for support triage; ability to unlock temporarily locked user accounts. Cannot modify user roles or delete resources. |
| `ROLE_CONTENT_MANAGER` | `V11__seed_content_manager_role.sql` | Inventory / Content Specialist. Can create, update, and manage travel catalog inventory (accommodations, transports, activities). Cannot access sensitive user identity or payment records. |

### Role Authorization Matrix

| Domain / Resource | Endpoint | Method | Permitted Roles / Conditions | Audit Log |
|---|---|---|---|---|
| **Identity / Auth** | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password` | POST | Public (`permitAll`) | `security_events` |
| | `/auth/me`, `/auth/change-password` | GET, POST | Authenticated (`ROLE_USER`, `ROLE_ADMIN`, `ROLE_SUPPORT`, `ROLE_CONTENT_MANAGER`) | None |
| **Admin Operations** | `/admin/users` | GET | `ROLE_ADMIN`, `ROLE_SUPPORT` | `admin_actions` |
| | `/admin/users/{id}` | GET | `ROLE_ADMIN`, `ROLE_SUPPORT` | `admin_actions` |
| | `/admin/users/{id}/roles` | PUT | `ROLE_ADMIN` | `admin_actions` |
| | `/admin/users/{id}/status` | PUT | `ROLE_ADMIN` | `admin_actions` |
| | `/admin/users/{id}/unlock` | POST | `ROLE_ADMIN`, `ROLE_SUPPORT` | `admin_actions` |
| | `/admin/users/{id}` | DELETE | `ROLE_ADMIN` | `admin_actions` |
| **Travel Catalog** | `/apir/hebergements/all`, `/apir/hebergements/{id}`, `/apir/hebergements/search` | GET, POST | Public (`permitAll`) | None |
| | `/apir/transports/all`, `/apir/transports/{id}`, `/apir/transports/search/**` | GET, POST | Public (`permitAll`) | None |
| | `/apir/activities/all`, `/apir/activities/{id}`, `/apir/activities/search/**` | GET, POST | Public (`permitAll`) | None |
| | `/apir/hebergements/**`, `/apir/transports/**`, `/apir/activities/**` (create, update, delete) | POST, PUT, DELETE | `ROLE_ADMIN`, `ROLE_CONTENT_MANAGER` | `admin_actions` |
| **Bookings / Reservations** | `/apir/reservations/me` | GET | Authenticated (returns own reservations only) | None |
| | `/apir/reservations/all` | GET | `ROLE_ADMIN`, `ROLE_SUPPORT` | None |
| | `/apir/reservations/id/{id}`, `/apir/reservations/{id}` | GET | Resource owner (`sub == reservation.idu`) OR `ROLE_ADMIN`, `ROLE_SUPPORT` | None |
| | `/apir/reservations/create` | POST | Authenticated (`sub` derived server-side) | None |
| | `/apir/reservations/create/{idu}` (legacy) | POST | Non-admin overridden to `sub`; `ROLE_ADMIN` can specify `idu` | None |
| | `/apir/reservations/update/{id}` | PUT | Resource owner (`sub == reservation.idu`) OR `ROLE_ADMIN` | None |
| | `/apir/reservations/delete/{id}` | DELETE | Resource owner (`sub == reservation.idu`) OR `ROLE_ADMIN` | None |
| **Admin Dashboard** | `/apir/admin/**` (stats, recent) | GET | `ROLE_ADMIN`, `ROLE_SUPPORT` | None |
| **Payments** | `/apir/paiements/all` | GET | `ROLE_ADMIN`, `ROLE_SUPPORT` | None |
| | `/apir/paiements/{id}` | GET | Related reservation owner OR `ROLE_ADMIN`, `ROLE_SUPPORT` | None |
| | `/apir/paiements/create` | POST | Related reservation owner OR `ROLE_ADMIN` | None |
| | `/apir/paiements/update/{id}`, `/apir/paiements/delete/{id}` | PUT, DELETE | `ROLE_ADMIN` | None |
| **Engagement / Comments** | `/apic/comments/all`, `/apic/comments/{id}` | GET | Public (`permitAll`) | None |
| | `/apic/comments/create` | POST | Authenticated (`email` & `username` derived from JWT) | None |
| | `/apic/comments/delete/{id}` | DELETE | Comment author (`jwt.email == comment.email`) OR `ROLE_ADMIN` | None |
| **AI Assistant** | `/ai/**` | GET | Authenticated (`ROLE_USER`, `ROLE_ADMIN`, `ROLE_SUPPORT`, `ROLE_CONTENT_MANAGER`) | None |

---

## 3. Defense-in-Depth Architecture

```text
 Client Request (with Bearer JWT or Spoofed Headers)
                    │
                    ▼
┌────────────────────────────────────────────────────────┐
│                  API Gateway Perimeter                 │
│                                                        │
│ 1. Strip all incoming X-User-* headers (anti-spoofing) │
│ 2. Cryptographically verify RS256 JWT signature        │
│ 3. Reject invalid/expired JWTs with 401 Unauthorized   │
│ 4. Re-inject verified identity headers:                │
│    - X-User-Id: <sub (UUID)>                           │
│    - X-User-Roles: ROLE_USER,ROLE_ADMIN...             │
│    - X-User-Email: <email>                             │
└───────────────────────────┬────────────────────────────┘
                            │
            (Forward to downstream services)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Downstream Microservice Perimeter          │
│                                                        │
│ 1. Independent RS256 token verification via JwtDecoder │
│ 2. Build SecurityContext with GrantedAuthority (ROLE_) │
│ 3. Enforce Route & @PreAuthorize Method Security       │
│ 4. Enforce IDOR Ownership Checks against JWT Subject   │
│ 5. Emit Audit Log for Privileged Actions               │
└────────────────────────────────────────────────────────┘
```

### 3.1 Anti-Spoofing at API Gateway
`JwtAuthenticationGatewayFilter` inspects every incoming HTTP request:
* The list of headers `X-User-Id`, `X-User-Email`, `X-User-Roles`, `X-User-Name`, `X-User-Country` are removed from the incoming request.
* If a Bearer JWT is present, it is verified against the RSA public key.
* If valid, the verified claims are set on the downstream request.
* If invalid or expired, the request is immediately terminated with HTTP `401 Unauthorized`.

### 3.2 Independent Token Verification Downstream
Downstream services (`identity-service`, `reservation-service`, `commentaire-service`, `ai-service`) do NOT trust incoming headers for authorization decisions. Instead:
* Each service includes `spring-boot-starter-oauth2-resource-server`.
* Each service loads `certs/public.pem` into an `RSAPublicKey` bean and configures a `NimbusJwtDecoder`.
* Spring Security maps the `roles` array claim to `GrantedAuthority` objects without duplicate prefixes.

---

## 4. IDOR Elimination & Server-Side Ownership

Insecure Direct Object References (IDOR) occur when an application relies on client-provided identifiers to access or modify resources without verifying ownership.

In Yuding V2, IDOR vulnerabilities have been completely eradicated:

1. **User Profile Access**:
   * Replaced `/api/utilisateurs/id/{id}` with authenticated `/auth/me`.
   * Returns profile data strictly corresponding to `jwt.getSubject()`.
2. **Bookings / Reservations**:
   * Introduced `/apir/reservations/me`: extracts `jwt.getSubject()` and queries `reservationRepository.findByIdu(userId)`.
   * `/apir/reservations/id/{id}`: retrieves reservation and enforces `SecurityUtils.isOwnerOrPrivileged(reservation.getIdu())`. Non-owners receive HTTP `403 Forbidden`.
   * `/apir/reservations/create`: overrides the reservation `idu` with the authenticated token's subject.
   * `/apir/reservations/create/{idu}` (legacy compatibility): non-admin users cannot supply arbitrary `idu`; the system enforces `effectiveUserId = SecurityUtils.hasRole("ADMIN") ? idu : jwtUserId`.
   * `/apir/reservations/update/{id}` & `/delete/{id}`: verify existing ownership before modification or deletion.
3. **Payments**:
   * `/apir/paiements/create`: looks up the target reservation and ensures the authenticated user owns that reservation before associating a payment.
   * `/apir/paiements/{id}`: verifies ownership of the underlying reservation.
4. **Reviews / Comments**:
   * `/apic/comments/create`: automatically overwrites `email` and `username` with verified JWT claims (`jwt.getClaimAsString("email")` and `jwt.getClaimAsString("name")`).
   * `/apic/comments/delete/{id}`: verifies that `jwt.email.equalsIgnoreCase(comment.email)` or `hasRole('ADMIN')`.

---

## 5. Audit Logging for Privileged Operations

All administrative operations performed in `identity-service` are persisted in PostgreSQL:
* **Table `audit.admin_actions`**:
  * Fields: `id`, `admin_user_id`, `action`, `target_service`, `target_entity_type`, `target_entity_id`, `details`, `metadata`, `created_at`.
  * Audited operations: `ROLE_UPDATE`, `STATUS_UPDATE`, `ACCOUNT_UNLOCK`, `USER_DELETE`.
* **Table `audit.security_events`**:
  * Fields: `id`, `user_id`, `event_type`, `ip_address`, `user_agent`, `status`, `details`, `created_at`.
  * Audited operations: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `ACCOUNT_LOCKED`, `TOKEN_REUSE_DETECTED`, `PASSWORD_RESET_SUCCESS`.

Sensitive parameters (such as passwords, tokens, PAN, CVV) are never logged or stored in audit payloads.

---

## 6. Automated Test Coverage

The RBAC implementation is validated by dedicated automated test suites across the services:

1. **`JwtAuthenticationGatewayFilterTest` (`gateway-service`)**:
   * `filter_stripsSpoofedHeaders_whenNoToken()`: Verifies that client-supplied `X-User-*` headers are stripped when no Authorization header is present.
   * `filter_rejectsMalformedToken_with401()`: Verifies that malformed or tampered Bearer tokens receive immediate HTTP 401 without hitting downstream routes.
2. **`AdminUserControllerTest` (`identity-service`)**:
   * `anonymousAccess_rejectedWith401()`: Anonymous requests to `/admin/users` return 401.
   * `normalUserAccess_rejectedWith403()`: `ROLE_USER` access to `/admin/users` returns 403 Forbidden.
   * `supportUser_canViewUsers()`: `ROLE_SUPPORT` can list users (200 OK).
   * `supportUser_cannotModifyRoles()`: `ROLE_SUPPORT` attempting to change roles receives 403 Forbidden.
   * `adminUser_canModifyRoles()`: `ROLE_ADMIN` can change roles (200 OK).
   * `adminUser_canUnlockAccount()`: `ROLE_ADMIN` can unlock accounts (200 OK).
3. **`ReservationSecurityTest` (`reservation-service`)**:
   * `anonymousAccess_rejectedWith401()`: Anonymous access to `/me` returns 401.
   * `normalUser_cannotViewAllReservations()`: `ROLE_USER` cannot call `/all` (403).
   * `adminUser_canViewAllReservations()`: `ROLE_ADMIN` can call `/all` (200).
   * `supportUser_canViewAllReservations()`: `ROLE_SUPPORT` can call `/all` (200).
   * `user_canViewOwnReservation()`: Owner can view reservation on `/id/1` (200).
   * `idor_userCannotViewAnotherUsersReservation()`: User 10 attempting to view reservation of User 20 returns 403 Forbidden.
   * `idor_userCannotDeleteAnotherUsersReservation()`: User 10 attempting to delete reservation of User 20 returns 403 Forbidden.
   * `admin_canDeleteAnotherUsersReservation()`: Admin can delete reservation of User 20 (204).
   * `normalUser_cannotCreateAccommodation()`: `ROLE_USER` cannot modify catalog (403).
   * `contentManager_canCreateAccommodation()`: `ROLE_CONTENT_MANAGER` can create catalog accommodation (201).
4. **`CommentaireSecurityTest` (`commentaire-service`)**:
   * `anonymousAccess_rejectedWith401()`: Anonymous cannot create comment (401).
   * `authenticatedUser_derivesIdentityFromToken()`: Author identity derived from token claims, ignoring spoofed fields (201).
   * `idor_userCannotDeleteAnotherUsersComment()`: User cannot delete another user's comment (403).
   * `user_canDeleteOwnComment()`: User can delete own comment (204).
   * `admin_canDeleteAnotherUsersComment()`: Admin can delete any comment (204).
