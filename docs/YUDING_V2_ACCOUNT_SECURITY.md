# Yuding V2 — Account Security Hardening Specification

## 1. Overview & Security Objectives

Phase 12 builds upon the authentication baseline (Phase 10) and role-based access control (Phase 11) to harden account lifecycle security, active session management, and intrusion detection across Yuding V2.

### Core Objectives
1. **Active Session Visibility & Control**: Users can view their active sessions across devices and terminate individual sessions or perform a global logout (`logout-all`).
2. **Session Continuity Across Rotation**: Token families share a persistent `session_id` across refresh-token rotations, enabling session tracking without compromising rotation security.
3. **Zero Credential Exposure**: Raw refresh tokens, token hashes, and unmasked network identifiers are never exposed in session responses or logs.
4. **Privacy-Preserving Auditability**: IP addresses are masked (e.g., `192.168.1.***`), and user agents are sanitized into friendly device/browser labels.
5. **Real-Time Suspicious Activity Logging**: Security-critical events (brute force attempts, account lockouts, logins from new devices, refresh-token reuse) are persisted to `audit.security_events` with associated risk scores.
6. **Email Verification Enforcement**: Sensitive account operations (such as password changes) require a verified email address (`is_email_verified = true`).
7. **Enumeration Resistance**: Forgot-password and authentication failure workflows preserve generic responses to prevent user enumeration.
8. **Roadmap for 2FA / TOTP**: Technical specification for future implementation of Time-Based One-Time Passwords (RFC 6238).

---

## 2. Database Schema & Migration V12

The schema updates for Phase 12 are defined in `infra/migrations/V12__account_security_hardening.sql`:

```sql
-- 1. Extend identity.refresh_tokens with session tracking metadata
ALTER TABLE identity.refresh_tokens
    ADD COLUMN IF NOT EXISTS session_id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(512),
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS revocation_reason VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id
    ON identity.refresh_tokens(session_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_active_session
    ON identity.refresh_tokens(user_id, session_id, revoked_at, expires_at);

-- 2. Extend audit.security_events with session association
ALTER TABLE audit.security_events
    ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS idx_security_events_user_id
    ON audit.security_events(user_id, created_at DESC);
```

### Key Schema Characteristics:
- `session_id`: Persistent UUID assigned at initial login or registration. Preserved during refresh token rotation so that all tokens in a device's rotation sequence belong to the same session.
- `revocation_reason`: Documents why a token became invalid (e.g., `ROTATED`, `LOGOUT`, `LOGOUT_ALL`, `SESSION_REVOKED`, `REUSE_DETECTED`, `PASSWORD_RESET`).
- `last_used_at`: Updated upon each token rotation or session activity.
- `idx_security_events_user_id`: Optimizes queries for authenticated user security history.

---

## 3. Session Management Lifecycle

### 3.1 Session Creation
- On `POST /auth/register` or `POST /auth/login`, a new `session_id` (UUID) is generated.
- Network metadata (`clientIp`, `userAgent`) is captured from the HTTP request headers (`X-Forwarded-For`, `User-Agent`).
- An initial `RefreshToken` is created with `session_id`, `user_agent`, `created_at = now()`, and `last_used_at = now()`.
- An HTTP-only, secure, same-site `refresh_token` cookie is returned to the client.

### 3.2 Token Rotation with Session Continuity
- When the client calls `POST /auth/refresh`:
  1. The existing active token is located by its SHA-256 hash.
  2. If the token is already revoked, **reuse detection triggers**: the entire token family for that user is revoked with reason `REUSE_DETECTED`, and a high-risk security alert (`riskScore: 90`) is recorded.
  3. If valid, the existing token is marked `revoked_at = now()` with `revocation_reason = 'ROTATED'`.
  4. A new refresh token is persisted **inheriting the same `session_id`** and original `created_at`, while updating `last_used_at = now()`.
  5. A new access token (RS256 JWT) and rotated refresh token cookie are returned.

### 3.3 Global Logout (`POST /auth/logout-all`)
- **Endpoint**: `POST /auth/logout-all` (Requires `ROLE_USER` or any authenticated role)
- **Behavior**:
  - Revokes all active refresh tokens for the authenticated user where `revoked_at IS NULL` and `expires_at > now()`.
  - Sets `revocation_reason = 'LOGOUT_ALL'` and `revoked_at = now()`.
  - Clears the client's current refresh token cookie with an expired `Set-Cookie`.
  - Emits a security audit event `LOGOUT_ALL`.

### 3.4 Active Session Inspection (`GET /auth/sessions`)
- **Endpoint**: `GET /auth/sessions` (Authenticated)
- **Response Format**:
```json
[
  {
    "sessionId": "4a73b4e2-7634-4b5c-a5b8-500b1a030ef1",
    "deviceLabel": "Chrome on Windows",
    "ipAddressMasked": "192.168.1.***",
    "createdAt": "2026-09-20T00:15:30Z",
    "lastUsedAt": "2026-09-20T01:05:10Z",
    "isCurrent": true
  },
  {
    "sessionId": "8d3e91a0-12bc-445e-b2d9-93e117eef982",
    "deviceLabel": "Mobile Safari on iPhone",
    "ipAddressMasked": "10.0.0.***",
    "createdAt": "2026-09-18T14:20:00Z",
    "lastUsedAt": "2026-09-19T22:11:05Z",
    "isCurrent": false
  }
]
```
- **Security Invariant**: Never reveals the raw token, hashed token, full IP address, or internal database primary key. The `isCurrent` boolean identifies the session corresponding to the caller's active refresh cookie/header.

### 3.5 Targeted Session Revocation
- **Endpoints**:
  - `DELETE /auth/sessions/{sessionId}`
  - `POST /auth/sessions/{sessionId}/revoke`
- **IDOR Protection**: The query filters by both `user_id == currentUserId` AND `session_id == targetSessionId`. If no active session matches, HTTP 404 (`ResourceNotFoundException`) is returned, preventing attackers from probing or terminating other users' sessions.
- **Revocation Cascade**: All tokens associated with that `session_id` are marked revoked with `revocation_reason = 'SESSION_REVOKED'`.

---

## 4. Privacy-Conscious Metadata Handling

To satisfy privacy standards (GDPR, CCPA) and prevent sensitive infrastructure leaks:

### 4.1 IP Masking (`PrivacyUtils`)
- **IPv4**: Redacts the host octet (e.g., `192.168.1.145` $\rightarrow$ `192.168.1.***`).
- **IPv6**: Preserves the first three groups and masks the remainder (e.g., `2001:db8:85a3:8d3:1319:8a2e:370:7334` $\rightarrow$ `2001:0db8:85a3:****`).
- Loopback addresses (`127.0.0.1`, `0:0:0:0:0:0:0:1`) are sanitized as `127.0.0.***`.

### 4.2 Device Parsing (`DeviceUtils`)
Parses `User-Agent` strings into friendly client summaries without storing raw strings in user-facing DTOs:
- Identifies OS: Windows, macOS, Linux, Android, iOS.
- Identifies Browser: Edge, Chrome, Safari, Firefox, Opera, Mobile Safari.
- Examples: `"Chrome on Windows"`, `"Mobile Safari on iPhone"`, `"Firefox on Linux"`.

---

## 5. Security Event Auditing & Suspicious Activity Detection

The `AuditService` logs structured security events into `audit.security_events`:

| Event Type | Trigger | Risk Score | Recorded Metadata |
|---|---|---|---|
| `LOGIN_SUCCESS` | Successful password validation | 0 | Client IP, User Agent, Session ID |
| `LOGIN_NEW_DEVICE` | Login from a previously unseen User-Agent | 15 | Client IP, Device Label, Session ID |
| `LOGIN_FAILURE` | Invalid password or unknown email | 25 | Client IP, User Agent, Failure Reason |
| `ACCOUNT_LOCKED` | 5 consecutive failed login attempts | 75 | Client IP, Lockout Duration (15 min) |
| `REFRESH_TOKEN_REUSE_DETECTED` | Presentation of an already-revoked refresh token | 90 | User ID, Session ID, Client IP |
| `LOGOUT_ALL` | User invokes global session termination | 10 | User ID, Client IP, Session Count |
| `SESSION_REVOKED` | User terminates a specific device session | 5 | Target Session ID, Client IP |
| `PASSWORD_RESET` | User completes reset with one-time token | 20 | User ID, Client IP, Sessions Revoked |
| `PASSWORD_CHANGED` | User updates password via `/auth/change-password` | 10 | User ID, Client IP |
| `EMAIL_VERIFIED` | Email confirmation token consumed | 0 | User ID |

### User Security History Endpoint
- **Endpoint**: `GET /auth/security-events` (Authenticated)
- Returns the user's last 20 security events with masked IPs, friendly device labels, failure reasons, and timestamps.

---

## 6. Email Verification Enforcement & Anti-Enumeration

### 6.1 Email Verification Requirement for Sensitive Actions
- In `AuthService.changePassword()`, before comparing passwords or updating credentials, the user status is verified:
```java
if (!user.isEmailVerified()) {
    throw new EmailNotVerifiedException("Email verification is required before changing password. Please verify your email address.");
}
```
- Rejections return HTTP 403 Forbidden with a clear explanation without breaking basic email verification or authentication flows.

### 6.2 Anti-Enumeration Protections
- `POST /auth/forgot-password` consistently returns:
  `"If an account exists for this email, password reset instructions have been sent."`
  even when the target email does not exist in the database.
- `POST /auth/login` returns `"Invalid email or password"` uniformly regardless of whether the email was not found or the password was incorrect.

---

## 7. Roadmap: Two-Factor Authentication (2FA / TOTP)

*Note: As specified, 2FA/TOTP is not implemented in the Phase 12 codebase but is formally documented below for subsequent phases.*

### 7.1 Proposed Architecture
- **Standard**: RFC 6238 Time-Based One-Time Password Algorithm (TOTP) with HMAC-SHA1 and 30-second time steps.
- **Database Schema Additions**:
```sql
ALTER TABLE identity.users
    ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS totp_secret_encrypted VARCHAR(255),
    ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS identity.totp_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
    code_hash VARCHAR(128) NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.2 Key Management & Encryption at Rest
- The TOTP shared secret (Base32 encoded) must be encrypted at rest using AES-GCM-256 with a dedicated KMS or environment secret key (`YUDING_SECURITY_ENCRYPTION_KEY`).
- Secrets must never be logged or transmitted in plain text outside the initial enrollment QR payload.

### 7.3 Enrollment & Verification Workflow
1. **Enrollment Request (`POST /auth/2fa/setup`)**:
   - Authenticated user requests 2FA setup.
   - Server generates a cryptographically secure 160-bit random secret.
   - Server constructs the standard URI:
     `otpauth://totp/Yuding:traveler@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Yuding&period=30&digits=6`
   - Returns URI / QR code and 8 single-use recovery codes (hashed with SHA-256 before storage).
2. **Confirmation (`POST /auth/2fa/enable`)**:
   - User submits a 6-digit TOTP code generated by Google Authenticator / 1Password.
   - Server validates the code within a $\pm 1$ time-step window.
   - Upon successful verification, sets `totp_enabled = true`.
3. **Login Step-Up (`POST /auth/login` $\rightarrow$ `POST /auth/2fa/verify`)**:
   - If user has `totp_enabled == true`, password validation returns an intermediate `2fa_required` token with a short expiration (3 minutes) instead of the full access/refresh token pair.
   - Client calls `POST /auth/2fa/verify` providing the temporary token and 6-digit code.
   - Upon verification, issues full access JWT and session refresh cookie.
