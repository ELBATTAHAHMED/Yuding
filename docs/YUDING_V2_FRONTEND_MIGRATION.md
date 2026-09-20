# Yuding V2 — Frontend Migration Specification (Next.js + React + TypeScript)

## 1. Migration Overview & Goals

In Phase 13, the legacy frontend originally located in `frontend/reservation/` has been completely rebuilt from the ground up under `frontend/web/` using modern web technologies:
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript 5 (Strict Mode)
- **Styling**: Adapted legacy stylesheets preserving 100% visual fidelity, color palette, dark mode, typography (Montserrat, Poppins, Space Grotesk), and layout hierarchy.

### Migration Philosophy
This is a **pure technology migration, not a redesign**. Visual layouts, user flows, images, videos, icons, and components from the legacy application are preserved. The legacy folder `frontend/reservation/` remains untouched as the permanent migration reference until full end-to-end acceptance is validated.

---

## 2. Directory Structure & Modular Architecture

The new application is organized under `frontend/web/` as follows:

```text
frontend/web/
├── public/
│   ├── favicon.ico
│   ├── a1.png
│   └── image/                 # Mirrored static assets (logos, heroes, photos, videos)
├── src/
│   ├── app/                   # Next.js App Router routes
│   │   ├── layout.tsx         # Global layout (fonts, FontAwesome, AuthProvider, AppShell)
│   │   ├── globals.css        # Resets and legacy stylesheet imports
│   │   ├── page.tsx           # Home page (/)
│   │   ├── login/page.tsx     # Flip-card Login & Signup (/login)
│   │   ├── register/page.tsx  # Registration redirect (/register)
│   │   ├── flights/page.tsx   # Flights search & offers (/flights)
│   │   ├── hotels/page.tsx    # Accommodations search & filters (/hotels)
│   │   ├── activities/page.tsx# Activities & excursions (/activities)
│   │   ├── transfers/page.tsx # Taxis, Trains & Car rental (/transfers)
│   │   ├── booking/           # Booking flow
│   │   │   ├── page.tsx       # Traveler details & booking submission (/booking)
│   │   │   └── confirmation/  # Booking confirmation card (/booking/confirmation)
│   │   ├── account/page.tsx   # Profile, active sessions & security log (/account)
│   │   └── admin/             # Admin Dashboard
│   │       ├── layout.tsx     # Admin shell (sidebar, topbar, role guard)
│   │       ├── page.tsx       # Overview & KPI stats (/admin)
│   │       └── users/page.tsx # User management & RBAC (/admin/users)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx     # Main topbar, brand logo, navigation links & dark mode
│   │   │   ├── Footer.tsx     # Global footer with brand links & contact
│   │   │   └── AppShell.tsx   # Layout switch between public routes and admin portal
│   │   └── common/
│   │       ├── DarkModeToggle.tsx # Theme switch (data-theme and .dark class)
│   │       └── ProtectedRoute.tsx # Route guard for authentication and roles
│   ├── features/
│   │   └── auth/
│   │       ├── AuthContext.tsx# In-memory JWT access token & auth state management
│   │       └── useAuth.ts     # Hook for accessing authentication state & actions
│   ├── lib/
│   │   └── api-client.ts      # Central fetch client routing exclusively through Gateway
│   ├── services/
│   │   ├── auth.service.ts    # Login, register, me, refresh, logout, sessions, security events
│   │   ├── travel.service.ts  # Catalog queries for hotels, flights, activities, transfers
│   │   ├── booking.service.ts # Reservations and booking confirmation
│   │   └── admin.service.ts   # Admin KPI statistics, user management, and role updates
│   ├── types/
│   │   ├── auth.types.ts      # UserProfile, ActiveSession, SecurityEvent, LoginRequest
│   │   ├── travel.types.ts    # HotelOffer, FlightOffer, ActivityOffer, TransferOffer
│   │   ├── booking.types.ts   # BookingRequest, BookingResponse, Traveler
│   │   └── admin.types.ts     # AdminStats, AdminUserSummary
│   └── styles/                # Adapted legacy CSS stylesheets
│       ├── style.css
│       ├── loginStyle.css
│       ├── VolStyle.css
│       ├── TaxiStyle.css
│       ├── TrainStyle.css
│       ├── VoitureStyle.css
│       ├── activiteeStyle.css
│       ├── confirmationStyle.css
│       └── stylesA-modern.css
├── package.json
├── tsconfig.json
└── next.config.js
```

---

## 3. Routes Migrated & Visual Mapping

| Route | Legacy Reference | Purpose & Features | Auth Requirement |
|---|---|---|---|
| `/` | `index.html` | Hero video, touch-search bar, popular destinations (Chefchaouen, Dakhla, Marrakech), accommodation categories, photo gallery, reviews form. | Public |
| `/login` | `login.html` | Interactive card with flip animation: Login on the front and Signup on the back, connected to Gateway auth endpoints. | Public |
| `/register` | `login.html` (signup view) | Direct link to registration flow within the flip card. | Public |
| `/flights` | `Vols.html` | Flight departure/arrival search, available flights list (Royal Air Maroc, Air France, Transavia), direct booking links. | Public |
| `/hotels` | `location.html` | Accommodation search by country/city, filter tabs (Hôtels, Maisons de vacances, Appartements), price per night, booking buttons. | Public |
| `/activities` | `activitees.html` | Excursion & experience search, category filter (Aventure, Sports Nautiques, Culture), duration and pricing. | Public |
| `/transfers` | `Taxis.html`, `Trains.html` | Transport transfer search with vehicle tabs: Taxi Privé, Trains & TGV, Location de Voitures. | Public |
| `/booking` | `reservationTransport.html` | Reservation form with traveler details, travel dates, passenger count, live cost summary. | Authenticated |
| `/booking/confirmation` | `confimation.html` | Success card with green checkmark, booking confirmation code, summary, and action buttons. | Authenticated |
| `/account` | *(New in V2)* | Authenticated profile (`/auth/me`), active session management (`/auth/sessions`), revoke session, logout-all, security audit log, change password. | Authenticated |
| `/admin` | `DACH/dashOverview.html` | Administration KPI cards (Reservations, Payments, Revenue, Inventory counts), recent reservations, recent payments. | `ROLE_ADMIN`, `ROLE_SUPPORT` |
| `/admin/users` | `DACH/dashUsers.html` | User accounts table, status inspection, account unlock action, RBAC role assignment modal. | `ROLE_ADMIN`, `ROLE_SUPPORT` |

---

## 4. Elimination of Legacy Anti-Patterns

1. **Complete Removal of jQuery**:
   - Replaced all `$.ajax`, `$('#...')`, and DOM-manipulating jQuery scripts with React state hooks (`useState`, `useEffect`, `useCallback`) and central `apiClient`.
2. **Zero Unsafe Browser Storage**:
   - Eliminated legacy `sessionStorage.getItem('isLoggedIn')`, `sessionStorage.getItem('userId')`, `localStorage.adminUser`.
   - Access tokens (RS256 JWTs) are stored **strictly in memory** via `AuthContext`.
   - Refresh tokens are transmitted solely through secure, **HttpOnly cookies** managed by the backend and Gateway.
   - `localStorage` is used exclusively for the user's visual theme preference (`'theme': 'dark' | 'light'`).
3. **No Direct Microservice Calls**:
   - Replaced hardcoded ports `8888`, `8081`, `8082`, `8084` with `NEXT_PUBLIC_API_BASE_URL` pointing exclusively to the API Gateway (`http://localhost:8080`).
4. **No Unsafe HTML Injection**:
   - All API-driven data is rendered through React JSX escaping. No `innerHTML` or `dangerouslySetInnerHTML` is used.

---

## 5. Security & Authentication Integration

- **Silent Session Restoration**:
  Upon application mount in `AuthProvider`, the client issues a silent `POST /auth/refresh` request with `credentials: 'include'`. If an active session cookie exists, a fresh in-memory access token is obtained and `GET /auth/me` populates the user profile.
- **Automatic Token Rotation & Refresh**:
  If an API call encounters an HTTP 401 Unauthorized response on an authenticated route, `apiClient` automatically calls `/auth/refresh` in the background, updates the in-memory access token, and transparently retries the original request.
- **Client-Side Role Guards (`ProtectedRoute`)**:
  - Validates `user.roles` before displaying protected screens (`/admin` requires `ROLE_ADMIN` or `ROLE_SUPPORT`).
  - Unauthenticated users are redirected to `/login?redirect=...`.
  - Non-privileged users receive an explicit 403 Access Denied notification.
- **Session & Intrusion Controls in `/account`**:
  - Authenticated users can inspect their active devices (`GET /auth/sessions`) with masked IP addresses (`192.168.1.***`) and friendly device labels.
  - Ability to terminate a specific device (`DELETE /auth/sessions/{id}`) or all active sessions (`POST /auth/logout-all`).
  - Audited security events history (`GET /auth/security-events`).

---

## 6. Verification Results

### Build & Compilation
- **Command**: `npm run build` in `frontend/web`
- **Result**: `✓ Compiled successfully`
- **Page Generation**: All 15 static/prerendered routes generated without errors.
- **TypeScript Checking**: `npx tsc --noEmit` passed with 0 blocking errors.
- **Legacy Preservation**: `frontend/reservation/` remains completely untouched.
