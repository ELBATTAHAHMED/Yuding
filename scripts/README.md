# Yuding Scripts

This directory houses development, operational, and database management scripts for the Yuding V2 platform.

## Local Development Stack

### Current One-Command Startup
To start the entire current Yuding V2 microservices stack and Next.js frontend with one command on Windows PowerShell:

```powershell
.\scripts\start-dev.ps1
```

To recompile all backend JARs and rebuild the frontend bundle before launching:
```powershell
.\scripts\start-dev.ps1 -Build
```

### Stop Development Stack
To stop all Yuding development services cleanly:
```powershell
.\scripts\stop-dev.ps1
```

### Important Docker Boundary
- **Current Development Model:**
  - Infrastructure (PostgreSQL 16 + pgvector and Redis 7): `docker compose -f infra/docker-compose.yml up -d`
  - Application Stack: `.\scripts\start-dev.ps1`
- **Later (Post-Docker Phases 70–72):**
  - Full application stack in Docker: `docker compose up --build`

## Service Ports & Architecture Reference
- **Frontend (Web):** `http://localhost:3000` (Flight search: `/flights`)
- **API Gateway:** `http://localhost:8888`
- **Eureka Discovery:** `http://localhost:8761`
- **Config Server:** `http://localhost:9091`
- **Identity Service:** `http://localhost:8081`
- **Travel Service:** `http://localhost:8082` (loads secrets from `backend/travel-service/.env.local`)
- **Reservation Service:** `http://localhost:8084`
- **Commentaire Service:** `http://localhost:8090`
- **AI Service:** `http://localhost:8072`
- **PostgreSQL 16:** `localhost:5433` (Database: `yuding`)
- **Redis 7:** `localhost:6379`
