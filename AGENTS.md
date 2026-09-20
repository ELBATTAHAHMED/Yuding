# Yuding V2 — Agent Development Rules

Permanent rules and architectural constraints for development on branch `develop-v2`.

## 1. Git & Workflow
- Work exclusively on `develop-v2` unless explicitly instructed otherwise.
- Never modify `main`, `legacy-v1`, or tag `v1-legacy`.
- Never force-push or rewrite Git history without explicit instruction.
- Complete ONLY the requested phase and STOP before starting the next phase.
- Inspect current repository state before implementing roadmap phases; completed phases supersede outdated roadmap text.
- Preserve compatibility with all previously completed phases.
- Compile and test before committing and pushing.
- Keep final reports concise.

## 2. Architecture
- Spring Boot microservices ecosystem.
- Preserve `discovery-service` (Eureka) and `config-service` (Spring Cloud Config).
- API Gateway (`gateway-service`, port 8888) is the single backend entry point.
- Frontend: Next.js + React + TypeScript in `frontend/web/`.
- Travel domain belongs in `travel-service`; do not create separate hotel/flight/activity/taxi microservices.
- Admin is role-protected functionality, not a standalone microservice.

## 3. Database & Schemas
- PostgreSQL database `yuding` is the sole relational platform (no MySQL/MariaDB).
- Logical schemas: `identity`, `travel`, `booking`, `payment`, `notification`, `engagement`, `ai`, `audit`.
- Each microservice strictly owns its logical schema; zero cross-schema direct table queries or joins.
- Flyway is the ONLY DDL authority. Never edit applied migrations (`V1`–`V12`); always add a new migration.
- Money fields must use `NUMERIC` / `BigDecimal`, never `FLOAT` or `DOUBLE`.
- `pgvector` extension is strictly isolated to schema `ai`.

## 4. Security & Privacy
- Defense-in-depth: authorization enforced at Gateway AND independently in downstream services.
- Token format: RS256 JWT validated using public key.
- Backend is authoritative for identity, roles, permissions, prices, and booking state.
- Never trust client-supplied user IDs or identity headers; Gateway strips spoofed `X-User-*` headers.
- Eliminate IDOR by verifying resource ownership server-side.
- Never store plaintext passwords or PAN/CVV card data; never commit secrets.
- Refresh tokens are HttpOnly cookies and never enter browser storage (`localStorage` / `sessionStorage`).
- Never log passwords, tokens, secrets, card data, or sensitive credentials.

## 5. Frontend (`frontend/web/`)
- Modern frontend lives in `frontend/web/` using Next.js App Router, React, and TypeScript.
- Legacy `frontend/reservation/` remains preserved untouched as visual/UX reference.
- Preserve Yuding's visual identity, styling, and layouts during migration.
- Zero jQuery and zero inline scripts in `frontend/web/`.
- All API traffic uses the central API client (`src/lib/api-client.ts`) routed via Gateway (`http://localhost:8888`).
- Never call microservices on direct ports (8081, 8082, 8084, 8090, 8072, 7777).
- Frontend route guards (`ProtectedRoute`) are UX only; backend authorization remains authoritative.
- No `localStorage.adminUser` or sessionStorage identity authority.
- Live cost summaries in `/booking` are display-only estimates; server/provider pricing is authoritative.

## 6. Authentication & RBAC
- Identity microservice is `identity-service` (port 8081).
- Roles: `ROLE_USER`, `ROLE_ADMIN`, `ROLE_SUPPORT`, `ROLE_CONTENT_MANAGER`.
- Passwords hashed with BCrypt (cost 12).
- Short-lived RS256 access tokens paired with rotating opaque refresh tokens stored hashed server-side.
- Preserve session continuity (`session_id`), token reuse detection, account lockout, and security event auditing.

## 7. Integrations & Third Parties
- Travel APIs integrate via provider adapters.
- Payments use a provider-neutral `PaymentProvider` abstraction; do not hardcode Stripe or specific PSPs.
- Live travel pricing and inventory availability come from providers/backend APIs.
- Vector search / RAG is for semantic knowledge content; live facts come from tools/APIs.

## 8. Documentation Reference
Before performing architectural work, consult ONLY the relevant documentation:
- Architecture: `docs/YUDING_V2_ARCHITECTURE.md`
- Database: `docs/YUDING_V2_DATABASE_DESIGN.md`
- Security Baseline: `docs/YUDING_V2_SECURITY_BASELINE.md`
- Authorization / RBAC: `docs/YUDING_V2_AUTHORIZATION_RBAC.md`
- Account Security: `docs/YUDING_V2_ACCOUNT_SECURITY.md`
- Frontend Migration: `docs/YUDING_V2_FRONTEND_MIGRATION.md`
