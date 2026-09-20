# Yuding V2 — Frontend Routing & Layouts

This document details the route tree, layout hierarchy, authorization boundaries, and navigation conventions for the Yuding V2 web application located in `frontend/web/`.

---

## 1. Architectural Principles

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript.
- **Route Groups:** Logical folder separation using Next.js route groups (`(groupName)`) allows isolated nested layouts, distinct styling contexts, and modular concern separation without modifying public URL paths.
- **Visual & Route Continuity:** All legacy URLs (`/`, `/login`, `/register`, `/flights`, `/hotels`, `/activities`, `/transfers`, `/booking`, `/account`, `/admin`) remain 100% backward-compatible and accessible at identical paths.
- **Defense in Depth:** Route protection components (`ProtectedRoute`) guard UI views for optimal UX, while the API Gateway (`http://localhost:8888`) and downstream microservices enforce authoritative security, session validity, and RBAC permissions.
- **Clean Fallbacks:** Subroutes for upcoming microservice capabilities (such as booking history or payment transaction audits) use robust empty states rather than simulated mock data.

---

## 2. Route Tree & Layout Hierarchy

```
frontend/web/src/app/
├── layout.tsx                     # Root Layout: HTML shell, fonts, global CSS, AuthProvider
├── globals.css                    # Shared theme tokens and base styles
├── (public)/                      # Public Marketing & Search Route Group
│   ├── layout.tsx                 # PublicLayout: Global Header + main container + Footer
│   ├── page.tsx                   # / (Home & Search landing page)
│   ├── flights/page.tsx           # /flights (Flight search & listing)
│   ├── hotels/page.tsx            # /hotels (Hotel search & listing)
│   ├── activities/page.tsx        # /activities (Activity discovery)
│   └── transfers/page.tsx         # /transfers (Airport transfers & taxis)
├── (auth)/                        # Isolated Authentication Route Group
│   ├── layout.tsx                 # AuthLayout: Isolated container (no public Header/Footer)
│   ├── login/page.tsx             # /login (Sign-in card & flip interaction)
│   └── register/page.tsx          # /register (Sign-up card)
├── (user)/                        # User Account Route Group
│   └── account/
│       ├── layout.tsx             # UserLayout: Header + ProtectedRoute + Account subnav + Footer
│       ├── page.tsx               # /account (Server redirect -> /account/profile)
│       ├── profile/page.tsx       # /account/profile (Personal info, sessions, password reset)
│       ├── bookings/page.tsx      # /account/bookings (User travel bookings & history)
│       └── favorites/page.tsx     # /account/favorites (Saved favorites & wishlists)
├── (checkout)/                    # Checkout & Booking Route Group
│   └── booking/
│       ├── layout.tsx             # CheckoutLayout: Focused checkout header + main + footer
│       ├── page.tsx               # /booking (Step-by-step reservation checkout)
│       ├── [reference]/page.tsx   # /booking/[reference] (Dynamic booking dossier view)
│       └── confirmation/page.tsx  # /booking/confirmation (Booking confirmation receipt)
└── (admin)/                       # Administrative Portal Route Group
    └── admin/
        ├── layout.tsx             # AdminLayout: ProtectedRoute + Collapsible Sidebar + Topbar
        ├── page.tsx               # /admin (Admin Overview & Key Metrics)
        ├── users/page.tsx         # /admin/users (RBAC assignment & account unlock)
        ├── bookings/page.tsx      # /admin/bookings (Reservations overview & filter)
        └── payments/page.tsx      # /admin/payments (Payment transactions & audit)
```

---

## 3. Layout Responsibilities

### 3.1 Root Layout (`src/app/layout.tsx`)
- Provides `<html>` and `<body>` tags with language set to `fr`.
- Injects external CDN assets: Google Fonts (`Montserrat`, `Poppins`, `Space Grotesk`) and FontAwesome icons (`v6.4.2`).
- Embeds `globals.css`.
- Wraps the entire application in `AuthProvider` (`src/features/auth/AuthContext.tsx`) for global authentication state and token refresh management.

### 3.2 Public Layout (`src/app/(public)/layout.tsx`)
- Encompasses user-facing marketing and search routes.
- Houses the main `Header` (with primary navigation links, login CTA, user menu, and dark mode toggle) and `Footer`.
- Sets a flexible minimum height (`calc(100vh - 200px)`) to guarantee footer stickiness on short pages.

### 3.3 Auth Layout (`src/app/(auth)/layout.tsx`)
- Strips out the public navigation and footer to prevent CSS inheritance conflicts and navigation distraction during credentials input.
- Provides a dedicated `.auth-layout-root` container with full viewport coverage.

### 3.4 User Account Layout (`src/app/(user)/account/layout.tsx`)
- Enforces user authentication via `<ProtectedRoute>` (redirects unauthenticated visitors to `/login`).
- Integrates persistent horizontal tab navigation across user account subroutes:
  - **Profil & Sécurité:** `/account/profile`
  - **Mes Réservations:** `/account/bookings`
  - **Mes Favoris:** `/account/favorites`
- Preserves the outer `Header` and `Footer` for natural site navigation.

### 3.5 Checkout Layout (`src/app/(checkout)/booking/layout.tsx`)
- Provides a focused container shell for the booking funnel.
- Wraps checkout steps, booking confirmation, and dynamic reference dossier pages.

### 3.6 Admin Layout (`src/app/(admin)/admin/layout.tsx`)
- Enforces strict RBAC via `<ProtectedRoute allowedRoles={['ROLE_ADMIN', 'ROLE_SUPPORT', 'ROLE_CONTENT_MANAGER']}>`.
- Provides an administrative workspace layout featuring:
  - Collapsible side navigation with links to Overview (`/admin`), Utilisateurs (`/admin/users`), Réservations (`/admin/bookings`), and Paiements (`/admin/payments`).
  - Top navigation bar with portal badge, dark mode toggle, and "Voir le site" return link.
  - Active admin user pill and instant logout action.

---

## 4. Subroutes & Dynamic Routing

### 4.1 Account Subroutes
- `/account`: Server-side redirect to `/account/profile` preserving legacy bookmarks and links.
- `/account/profile`: Active sessions review, session revocation (`POST /auth/sessions/revoke`), logout-all (`POST /auth/logout-all`), password change, and security event audit logs.
- `/account/bookings`: Reserved travel dossiers and vouchers view with responsive empty state and search CTA.
- `/account/favorites`: Wishlisted hotels and destinations view with responsive empty state.

### 4.2 Dynamic Booking Dossier (`/booking/[reference]`)
- Dynamic parameter `[reference]` matches booking alphanumeric locators (e.g. `/booking/BK-2026-9812`).
- Renders booking dossier summary, reference tracker, and navigation shortcuts back to `/account/bookings` and `/`.

### 4.3 Admin Subroutes
- `/admin`: Platform telemetry, quick stats, and administrative action tiles.
- `/admin/users`: User management table, account unlock action, and RBAC role assignment modal.
- `/admin/bookings`: Comprehensive reservations overview with status filters (`CONFIRMED`, `PENDING`, `CANCELLED`) and search.
- `/admin/payments`: Financial transactions and charge audit view with status filters (`SUCCEEDED`, `PENDING`, `REFUNDED`, `FAILED`).

---

## 5. Security & RBAC Enforcement

1. **Client-Side UX Guards (`ProtectedRoute`):**
   - Renders a loading spinner while checking `authService.getAccessToken()` and current user profile.
   - For unauthenticated users, redirects to `/login` preserving intended destination via query parameters.
   - For role-restricted routes (e.g. `/admin/*`), validates user role membership; unauthorized users are redirected to `/` or an access-denied state.
2. **Authoritative Backend Security:**
   - Client route protection is purely for UX. The single point of entry, API Gateway (`gateway-service`, port 8888), independently verifies RS256 JWT tokens and strips any spoofed `X-User-*` headers.
   - Downstream services (`identity-service`, `travel-service`, etc.) validate claims server-side.
