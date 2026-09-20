# Yuding V2 — Frontend State Management Architecture

This document specifies the state management architecture, server state caching, lifecycle rules, storage policies, and framework decisions for the Yuding V2 web client (`frontend/web/`).

---

## 1. State Classification & Boundaries

State within the Yuding V2 frontend is strictly categorized into four architectural tiers:

| State Tier | Authority / Mechanism | Scope & Examples |
| :--- | :--- | :--- |
| **A. Local UI State** | React `useState` / `useReducer` | Modal visibility, accordion tabs, search inputs, dropdown filters, card flips, local form validation. |
| **B. Server State** | TanStack Query (`@tanstack/react-query`) | Backend entity caches: active sessions (`/auth/sessions`), security events (`/auth/security-events`), admin users (`/admin/users`), admin metrics, travel listings, user bookings. |
| **C. Auth / Session State** | In-Memory (`ApiClient` + `AuthContext`) | Access token (RAM only), user profile snapshot, role helpers (`isAdmin`, `hasRole`), and session restoration orchestration. |
| **D. Client Preferences** | Browser Storage (`localStorage`) | Strictly constrained to visual theme preference (`theme: 'light' | 'dark'`). |

---

## 2. Server State: TanStack Query

### 2.1 Provider Architecture (`src/providers/QueryProvider.tsx`)
- TanStack Query is mounted at the root layout (`src/app/layout.tsx`) via `<QueryProvider>`.
- Employs a single `QueryClient` initialized within client state (`useState(() => makeQueryClient())`) to prevent cross-request SSR cache contamination.

### 2.2 QueryClient Defaults & Decoupled Retries
The central `apiClient` (Phase 16) already provides transport-level retry mechanics for transient failures (GET/HEAD on 502/503/504 and network errors) and handles single-flight 401 token refresh. **TanStack Query must NOT multiply these retries.**

```typescript
export const defaultQueryClientOptions: DefaultOptions = {
  queries: {
    retry: false,                // Transport retries already handled by apiClient
    staleTime: 1000 * 60 * 2,    // 2 minutes before fresh data becomes stale
    gcTime: 1000 * 60 * 10,      // 10 minutes cache retention
    refetchOnWindowFocus: false, // Prevent surprising refetches during tab switching
    refetchOnReconnect: true,    // Refresh upon recovering internet connection
  },
  mutations: {
    retry: false,                // Mutating operations are never automatically retried
  },
};
```

### 2.3 Normalized Errors
All query and mutation errors propagate standard `ApiError` instances from `apiClient`, providing typed access to `status`, `errorCode`, `requestId`, and `validationErrors`.

---

## 3. Centralized Query Keys (`src/lib/query-keys.ts`)

Query keys are defined through typed, hierarchical factory objects:

- `queryKeys.auth.me()` -> `['auth', 'me']`
- `queryKeys.auth.sessions()` -> `['auth', 'sessions']`
- `queryKeys.auth.securityEvents()` -> `['auth', 'security-events']`
- `queryKeys.admin.users()` -> `['admin', 'users']`
- `queryKeys.admin.stats()` -> `['admin', 'stats']`
- `queryKeys.booking.my()` -> `['booking', 'my']`
- `queryKeys.travel.hotels(filter)` -> `['travel', 'hotels', filter]`

---

## 4. Mutations & Cache Invalidation

Mutations trigger targeted query cache invalidations rather than full page reloads:

- **Session Revoke (`useRevokeSessionMutation`)**:
  - Invalidates `['auth', 'sessions']`
  - Invalidates `['auth', 'security-events']`
- **Logout All (`useLogoutAllMutation`)**:
  - Invalidates `['auth', 'sessions']`
- **Password Change (`useChangePasswordMutation`)**:
  - Invalidates `['auth', 'security-events']`
- **Admin User Role Modification (`useUpdateUserRolesMutation`)**:
  - Invalidates `['admin', 'users']`
- **Admin Account Unlock (`useUnlockUserMutation`)**:
  - Invalidates `['admin', 'users']`
- **Booking Creation (`useCreateBookingMutation`)**:
  - Invalidates `['booking', 'my']`

---

## 5. Authentication Authority & Storage Policy

1. **Tokens Never Enter Storage:**
   - Access tokens are stored **in-memory only**.
   - Refresh tokens are transmitted strictly as **HttpOnly cookies**.
   - JavaScript cannot read or manipulate the refresh token.
2. **Storage Audit Results:**
   - `localStorage`: Only `theme` key is permitted (consumed exclusively by `DarkModeToggle.tsx`).
   - `sessionStorage`: **Zero usage**.
   - Forbidden in storage: JWT, user profile, roles, permissions, admin flags, booking ownership, authoritative prices.
3. **No Competing Source of Truth:**
   - Backend identity service via API Gateway (`gateway-service`, port 8888) remains authoritative for all roles and user credentials.

---

## 6. Zustand Evaluation & Decision

> **Decision: Zustand is NOT required at this stage.**

**Rationale:**
- An audit of all current user flows (landing, search listings, hotel/flight/transfer details, booking checkout, account management, and admin dashboard) confirmed that all cross-component state is either:
  1. Server state appropriately managed and cached by TanStack Query;
  2. Transient URL parameters (e.g., search destinations, dates, booking references);
  3. Simple local component UI state (`useState`); or
  4. Authentication orchestration (`AuthContext`).
- There is currently no complex, multi-page client-only draft state (such as an offline multi-step trip builder) that would warrant an external global client store like Zustand or Redux.
- Avoiding unnecessary libraries keeps the bundle lean and reduces architectural complexity.
