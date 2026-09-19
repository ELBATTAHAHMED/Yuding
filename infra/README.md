# Yuding Infrastructure

This directory contains container definitions, orchestration manifests, and database initialization scripts for the Yuding V2 platform.

## Architecture Status (Phase 6 — PostgreSQL Only)

- **Database Platform:** **PostgreSQL 16** with **pgvector** (`pgvector/pgvector:pg16`).
- **Database Name:** `yuding`
- **Cache & Rate Limiting:** **Redis 7** (`redis:7-alpine`).
- **Legacy Removal:** MySQL 8, MariaDB drivers, and phpMyAdmin are completely eliminated.

### Logical Schemas Architecture

All relational and vector data resides within the single `yuding` database, partitioned into 8 isolated logical schemas:

| Schema | Owning Service | Purpose |
|---|---|---|
| `identity` | `identity-service` (currently `user-service`) | Users, roles, credentials, permissions, refresh tokens. |
| `travel` | `travel-service` (target) | Destinations, accommodations, room types, activities, transports. |
| `booking` | `booking-service` (currently `reservation-service`) | Bookings, booking items, travelers, status history, price snapshots. |
| `payment` | `payment-service` (target) | Payment intents, financial ledger transactions, refund records. |
| `notification` | `notification-service` (target) | Notification message queue, delivery dispatch logs, email templates. |
| `engagement` | `travel-service` (currently `commentaire-service`) | Customer reviews, ratings, comments, likes, saved itineraries. |
| `ai` | `ai-service` | Document chunks, vector embeddings (`pgvector`), chat sessions, tool logs. |
| `audit` | Cross-cutting | Tamper-evident security logs, login attempts, compliance records. |

### Running the Infrastructure & Database Migrations

To start the local PostgreSQL 16 (+ pgvector) and Redis containers, and automatically apply Flyway migrations:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Flyway executes all migrations from `infra/migrations/` sequentially:
- `V1__bootstrap_yuding_database.sql` — provisions 8 logical schemas and enables `pgvector` in schema `ai`.
- `V2__create_identity.sql` — provisions user, role, and auth token tables.
- `V3__create_travel.sql` — provisions destination, accommodation, flight, activity, and transport tables.
- `V4__create_booking.sql` — provisions booking lifecycle, items, travelers, and snapshot tables.
- `V5__create_payment.sql` — provisions payment ledger, webhooks, refunds, and idempotency tables.
- `V6__create_notification.sql` — provisions notification dispatch queue, templates, and delivery logs.
- `V7__create_engagement.sql` — provisions reviews, favorites, search history, and saved trips.
- `V8__create_ai.sql` — provisions AI conversation sessions, RAG document chunks, and `pgvector` embeddings with HNSW indexing.
- `V9__create_audit.sql` — provisions immutable compliance, security, and administrative audit tables.

To inspect Flyway migration status manually:

```bash
docker compose -f infra/docker-compose.yml run --rm flyway info
```

To run migrations manually:

```bash
docker compose -f infra/docker-compose.yml run --rm flyway migrate
```

To inspect PostgreSQL schemas using `psql`:

```bash
docker exec -it yuding-postgres psql -U postgres -d yuding -c "\dn"
```

To connect from host tools (e.g. DBeaver, IDE, or host-run services):
- **Host:** `localhost`
- **Port:** `5433` *(dedicated to avoid conflicts with other local databases)*
- **Database:** `yuding`
- **Username:** `postgres`
- **Password:** `postgres`

To stop the containers:

```bash
docker compose -f infra/docker-compose.yml down
```
