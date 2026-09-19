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

### Running the Infrastructure

To start the local PostgreSQL 16 (+ pgvector) and Redis containers:

```bash
docker compose -f infra/docker-compose.yml up -d
```

The initialization script (`infra/init-db/01-init-schemas.sql`) executes automatically on first container startup to enable `vector` and provision all 8 logical schemas.

To inspect PostgreSQL schemas using `psql`:

```bash
docker exec -it yuding-postgres psql -U postgres -d yuding -c "\dn"
```

To stop the containers:

```bash
docker compose -f infra/docker-compose.yml down
```
