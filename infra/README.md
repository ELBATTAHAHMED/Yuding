# Yuding Infrastructure

This directory contains container definitions, orchestration manifests, and infrastructure configuration for the Yuding V2 platform.

## Architecture Status (Phase 3 — Clean Repository)

As part of the V1 repository cleanup:
- **Obsolete V1 services removed:**
  - `discovery-service` (Netflix Eureka Server) — Replaced by container DNS and explicit service URLs.
  - `config-service` (Spring Cloud Config Server) & `config-repo` (submodule) — Replaced by standard environment variables and `.env` profiles.
  - `mysql:8` & `phpmyadmin` — Obsolete uncoordinated MySQL databases with blank passwords removed.

- **Upcoming V2 Infrastructure (Planned):**
  - Consolidated **PostgreSQL 16** with **pgvector** extension for relational and semantic vector storage.
  - **Redis** for distributed session management and rate limiting.
  - Production-grade multi-stage container builds with Temurin JDK 21.
  - Centralized environment variables (`.env.example`) and secrets management.
