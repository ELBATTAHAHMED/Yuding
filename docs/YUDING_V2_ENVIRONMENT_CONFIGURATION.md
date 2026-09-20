# Yuding V2 — Environment Configuration Architecture

This document specifies the multi-environment configuration architecture, profile activation rules, configuration server hierarchy, service settings, database port isolation policies, and frontend environment variables for Yuding V2 across branch `develop-v2`.

---

## 1. Architectural Principles

1. **Configuration-Driven Execution:** Switching between environments (`dev`, `test`, `staging`, `prod`) requires zero modifications to Java or TypeScript source code.
2. **Centralized Config Authority:** Spring Cloud Config Server (`backend/config-service`, port `9091`) serves centralized configuration properties to all microservices.
3. **Preserved Infrastructure:** Preserves `discovery-service` (Netflix Eureka, port `8761`) and `config-service`.
4. **Gateway as Single Entry Point:** API Gateway (`gateway-service`, port `8888`) remains the authoritative front door for all client traffic.
5. **Database Port Isolation:** Local host development PostgreSQL is strictly mapped to port `5433` (`localhost:5433`) to ensure zero port collision with JudgeLab (`5432`). In containerized staging/production, standard container networking (`postgres:5432`) or cloud database connection URLs (`DB_URL`) are used.
6. **Defense-in-Depth & Secret Hygiene:** Real credentials, private keys, and API secrets are never committed to version control. Default values in tracked YAML/properties are safe local development placeholders only.

---

## 2. Supported Environments & Spring Profiles

Yuding V2 formally defines four execution environments activated via `SPRING_PROFILES_ACTIVE`:

| Environment | Spring Profile | Primary Purpose | Database Target | Eureka Registration | Log Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Development** | `dev` | Local developer workstations | `localhost:5433` (PostgreSQL) | Enabled (`localhost:8761`) | `DEBUG` / `INFO` |
| **Test** | `test` | Automated CI/CD pipelines & unit/integration tests | Isolated test DB / H2 | Disabled / standalone | `INFO` / `WARN` |
| **Staging** | `staging` | Pre-production validation, end-to-end integration | `postgres:5432` / Managed DB | Enabled (cluster/dns) | `INFO` |
| **Production** | `prod` | Live production workloads | High-availability PostgreSQL cluster | Enabled (multi-zone) | `WARN` / `ERROR` |

---

## 3. Spring Cloud Config Architecture & Hierarchy

### 3.1 Repository Layout
Centralized configurations are maintained in the root `config/` directory and mirrored to `backend/config-service/src/main/resources/config/` for native classpath packaging:

```text
config/
├── application.yml                 # Global base defaults across all services
├── application-dev.yml             # Global development profile overrides
├── application-test.yml            # Global test profile overrides
├── application-staging.yml         # Global staging profile overrides
├── application-prod.yml            # Global production profile overrides
├── gateway-service.yml             # Gateway base routing & CORS config
├── gateway-service-dev.yml         # Gateway dev CORS (localhost:3000, etc.)
├── gateway-service-staging.yml     # Gateway staging CORS & security
├── gateway-service-prod.yml        # Gateway prod strict CORS & rate limits
├── identity-service.yml            # Identity base JPA & security defaults
├── identity-service-dev.yml        # Identity dev token lifespans & logging
├── identity-service-staging.yml    # Identity staging token & provider settings
├── identity-service-prod.yml       # Identity prod hardened security & pool sizing
├── reservation-service.yml         # Reservation base schema & provider defaults
├── reservation-service-dev.yml     # Reservation dev mock travel adapters
├── reservation-service-staging.yml # Reservation staging sandbox provider APIs
├── reservation-service-prod.yml    # Reservation prod live provider APIs
├── commentaire-service.yml         # Comments & reviews base configuration
├── commentaire-service-dev.yml     # Comments dev configuration
├── commentaire-service-staging.yml # Comments staging configuration
├── commentaire-service-prod.yml    # Comments prod configuration
├── ai-service.yml                  # AI service pgvector & model base config
├── ai-service-dev.yml              # AI service dev OpenAI mock/test keys
├── ai-service-staging.yml          # AI service staging sandbox OpenAI keys
└── ai-service-prod.yml             # AI service prod production AI models
```

### 3.2 Property Precedence Order
When a Spring Boot microservice boots under profile `${SPRING_PROFILES_ACTIVE}`, configuration is resolved according to standard Spring Cloud hierarchy (lowest to highest precedence):

1. `application.yml` (shared across all microservices)
2. `application-{profile}.yml` (shared environment overrides)
3. `{service-name}.yml` (service-specific base properties)
4. `{service-name}-{profile}.yml` (service-specific environment overrides)
5. Operating System Environment Variables (`export FOO=bar` or Docker/K8s `env`)
6. Java System Properties (`-Dfoo=bar`)
7. Command-line arguments (`--foo=bar`)

### 3.3 Config Service Native Search Locations
The Config Server is configured via `backend/config-service/src/main/resources/application.properties` with:
```properties
spring.profiles.active=${CONFIG_SERVER_PROFILE:native}
spring.cloud.config.server.native.search-locations=${CONFIG_SEARCH_LOCATIONS:classpath:/config,file:./config,file:../config,file:../../config,file:/config}
```
This enables zero-dependency local startup (reading directly from classpath or relative folders) while supporting container volume mounts (`file:/config`) in staging and production.

---

## 4. Database & Infrastructure Port Isolation Rules

### 4.1 PostgreSQL Port Rule (Host 5433 vs Container 5432)
- **Local Host Development (`dev`):**
  PostgreSQL runs on host port **`5433`** (`localhost:5433`).
  > [!IMPORTANT]
  > JudgeLab runs on local host port `5432`. To prevent catastrophic collisions, Yuding V2 microservices running locally default to `DB_PORT=5433`. JudgeLab MUST NEVER be touched.
- **Docker Compose / Container Networks (`staging` / `prod`):**
  Inside container bridges or Kubernetes pods, microservices connect to `postgres:5432`.
- **Direct Connection URL (`DB_URL`):**
  If `DB_URL` is supplied (e.g. AWS RDS, Azure Database for PostgreSQL, Supabase), it takes precedence over discrete host/port parameters:
  ```properties
  spring.datasource.url=${DB_URL:jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5433}/${DB_NAME:yuding}}
  ```

### 4.2 Infrastructure Services Port Map
| Service | Role | Local Host Port | Eureka Service ID |
| :--- | :--- | :--- | :--- |
| `discovery-service` | Eureka Service Registry | `8761` | `DISCOVERY-SERVICE` |
| `config-service` | Spring Cloud Config Server | `9091` | `CONFIG-SERVICE` |
| `gateway-service` | Spring Cloud API Gateway | `8888` | `GATEWAY-SERVICE` |
| `identity-service` | Auth, RBAC, Account Security | `8081` | `IDENTITY-SERVICE` |
| `reservation-service` | Travel Domain & Bookings | `8090` | `RESERVATION-SERVICE` |
| `commentaire-service` | Reviews & Engagement | `8072` | `COMMENTAIRE-SERVICE` |
| `ai-service` | Assistant, RAG, pgvector | `7777` | `AI-SERVICE` |
| `web` (Next.js) | Frontend Web Application | `3000` | N/A (Client) |

---

## 5. Frontend (`frontend/web/`) Environment Architecture

### 5.1 Centralized Typed Environment (`src/lib/env.ts`)
Client and server components access environment configuration strictly via `src/lib/env.ts`. No raw `process.env.NEXT_PUBLIC_*` lookups are scattered across UI components.

```typescript
export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888',
  appEnv: (process.env.NEXT_PUBLIC_APP_ENV || 'development') as AppEnvironment,
  isDev: (process.env.NEXT_PUBLIC_APP_ENV || 'development') === 'development',
  isStaging: process.env.NEXT_PUBLIC_APP_ENV === 'staging',
  isProd: process.env.NEXT_PUBLIC_APP_ENV === 'production',
};
```

### 5.2 API Gateway Routing
All API calls from `frontend/web/` route exclusively through the central API client (`src/lib/api-client.ts`) pointing to `env.apiBaseUrl`.
Direct connections to microservice ports (`8081`, `8090`, `8072`, `7777`) are strictly forbidden.

### 5.3 Staging Builds
Next.js naturally recognizes `.env.development` and `.env.production`. For staging deployments, `frontend/web/package.json` provides:
```bash
npm run build:staging
```
This executes `NEXT_PUBLIC_APP_ENV=staging next build`, signaling staging mode without corrupting production builds.

### 5.4 Zero Secrets in Frontend
- Only variables prefixed with `NEXT_PUBLIC_` are bundled into client JavaScript.
- **Zero secrets, API keys, or private credentials may ever be prefixed with `NEXT_PUBLIC_`.**
- Session tokens are in-memory access tokens; refresh tokens are HttpOnly cookies.

---

## 6. Environment Variables Reference Dictionary

| Environment Variable | Default (Dev) | Description | Target Scope |
| :--- | :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | `dev` | Active Spring profile (`dev`, `test`, `staging`, `prod`) | Backend Services |
| `CONFIG_SERVER_PROFILE` | `native` | Config Server backend mode (`native` or `git`) | `config-service` |
| `CONFIG_SEARCH_LOCATIONS`| `classpath:/config,...`| Search paths for native config YAML files | `config-service` |
| `DB_HOST` | `localhost` | PostgreSQL host (`localhost` or container `postgres`) | Backend Services |
| `DB_PORT` | `5433` (dev) / `5432` | PostgreSQL port (`5433` on local host; `5432` in container) | Backend Services |
| `DB_NAME` | `yuding` | Logical database name | Backend Services |
| `DB_USERNAME` | `postgres` | Database role username | Backend Services |
| `DB_PASSWORD` | `postgres` | Database role password | Backend Services |
| `DB_URL` | *(calculated)* | Optional full JDBC URL override (cloud databases) | Backend Services |
| `REDIS_HOST` | `localhost` | Redis caching and rate-limiting host | Backend Services |
| `REDIS_PORT` | `6379` | Redis port | Backend Services |
| `REDIS_PASSWORD` | *(empty)* | Redis authentication password | Backend Services |
| `DISCOVERY_SERVICE_URL` | `http://localhost:8761/eureka` | Eureka service registry endpoint | Backend Services |
| `CONFIG_SERVICE_URL` | `http://localhost:9091` | Central Spring Cloud Config server URL | Backend Services |
| `GATEWAY_SERVICE_URL` | `http://localhost:8888` | Backend gateway entry point URL | Gateway / System |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,...` | Allowed CORS origins for Gateway | `gateway-service` |
| `JWT_SECRET` | *(dev placeholder)* | 256-bit secret for RS256/HS256 signature verification | Identity & Gateway |
| `JWT_EXPIRATION_MS` | `900000` (15m) | Access token expiration in milliseconds | `identity-service` |
| `JWT_REFRESH_EXPIRATION_MS` | `604800000` (7d) | Refresh token expiration in milliseconds | `identity-service` |
| `PAYMENT_PROVIDER` | `MOCK` | Active payment processor (`MOCK`, `STRIPE`, `PAYPAL`) | Travel/Reservation |
| `OPENAI_API_KEY` | *(placeholder)* | LLM provider API key | `ai-service` |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8888` | API Gateway base URL for browser API traffic | `frontend/web` |
| `NEXT_PUBLIC_APP_ENV` | `development` | Frontend environment (`development`, `staging`, `production`) | `frontend/web` |

---

## 7. Security & Secret Management Verification

1. **Local Development Safety:** Developers can start the full stack with zero environment setup using safe local defaults.
2. **Production Hardening Checklist:**
   - [ ] Set `SPRING_PROFILES_ACTIVE=prod`.
   - [ ] Provide strong random `JWT_SECRET` (>= 32 characters) via container secret or vault.
   - [ ] Provide production `DB_USERNAME` and `DB_PASSWORD` with least-privilege schema ownership.
   - [ ] Restrict `CORS_ALLOWED_ORIGINS` to the verified production web domain (e.g. `https://yuding.travel`).
   - [ ] Configure live `PAYMENT_PROVIDER` credentials and webhook secrets.
   - [ ] Ensure `.env` and `.env.local` files are listed in `.gitignore` and never committed.
   - [ ] Confirm no private API tokens are exposed in `frontend/web/.env.example` or client bundles.
