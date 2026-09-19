# Yuding V1 — Complete Audit & Inventory

**Date:** September 19, 2026  
**Auditor:** Antigravity AI Engineering Assistant  
**Repository:** [https://github.com/ELBATTAHAHMED/Yuding.git](https://github.com/ELBATTAHAHMED/Yuding.git)  
**Baseline Commit:** `975f9a16f08992d98d19709e06c6a0e231bf5f0a`  
**Active Working Branch:** `develop-v2`  
**Phase:** Phase 2 — Complete Audit & Inventory of Yuding V1 (Analysis & Documentation Only)

---

## 1. Executive Summary

Yuding V1 is a prototype travel reservation platform consisting of a polyglot microservice backend (Java 21 / Spring Boot 3.4.2 / Spring Cloud 2024.0.0 / Spring AI 1.0.0-M5) and a static multipage web frontend (HTML5 / jQuery 3.6.0 / CSS3) with a dedicated administrative dashboard.

While the system successfully demonstrates a full microservice architecture pattern (API Gateway, Eureka Service Discovery, Spring Cloud Config Server, and Feign inter-service communication) along with basic booking capabilities and an OpenAI-powered RAG assistant, the audit reveals severe architectural, security, and operational flaws that make V1 unsuitable for production:

1. **Security & Authentication Zero-State:** There is no authentication framework (Spring Security is completely absent across all services). Passwords for both users and administrators are stored in plaintext in the database and returned in API responses. Session tokens or JWTs do not exist; frontend authentication relies entirely on unverified `sessionStorage` and `localStorage` values.
2. **PCI-DSS Violation & Unsafe Payments:** Raw credit card numbers, expiry dates, and CVVs are transmitted in plaintext HTTP JSON and stored unencrypted in MySQL. No Payment Service Provider (PSP) integration exists.
3. **Client-Authoritative Business Logic:** Pricing is calculated client-side with a hardcoded constant (`100 * duration * people`) in JavaScript. The backend accepts and persists client-submitted total prices without server-side validation.
4. **Submodule / Gitlink Desynchronization:** `backend/config-repo` is recorded in Git as a gitlink without a `.gitmodules` file or remote URL, causing fresh repository clones to fail during startup.
5. **Widespread Injection & XSS Vulnerabilities:** Chatbot AI outputs, user inputs, and administrative tables are rendered through unescaped `innerHTML` and jQuery `.html()` sinks.

The V2 initiative will completely rewrite the frontend into a unified Next.js (React + TypeScript) application, re-architect the backend domain into a consolidated, secure Spring Boot / PostgreSQL service architecture with authentic third-party travel APIs (Amadeus, Booking.com) and Stripe payment processing.

---

## 2. Repository Map

```text
Yuding/
├── .gitignore                                 # Git ignore file (Java, IDE, logs, OS files)
├── docker-compose.yml                         # Docker Compose orchestration (9 services + phpMyAdmin)
├── README.md                                  # High-level architecture documentation & port list
├── Yuding.png                                 # Architecture & presentation graphic asset
├── Plateforme de reservation des voyages.pptx # Project presentation slide deck
├── backend/                                   # Microservices backend root
│   ├── ai-service/                            # Spring AI + PgVector RAG microservice (Port 7777)
│   │   ├── Dockerfile
│   │   ├── pom.xml
│   │   └── src/main/java/com/ahmed/aiservice/
│   │       ├── AiServiceApplication.java
│   │       ├── Controller.java
│   │       └── IngestionService.java
│   ├── commentaire-service/                   # Customer review / comment service (Port 8072)
│   │   ├── Dockerfile
│   │   ├── pom.xml
│   │   └── src/main/java/com/ahmed/alertsservice/
│   │       ├── CommentaireServiceApplication.java
│   │       ├── config/DataInitializer.java
│   │       ├── controllers/CommentaireController.java
│   │       ├── DTO/CommentairesDTO.java
│   │       ├── DTO/responseDTO.java
│   │       ├── models/Commentaires.java
│   │       ├── repositories/CommentaireRepository.java
│   │       └── services/CommentaireServices.java
│   ├── config-repo/                           # Centralized Git configuration repository (Local Gitlink)
│   │   ├── ai-service.properties
│   │   ├── application.properties
│   │   ├── commentaire-service.properties
│   │   ├── reservation-service.properties
│   │   └── user-service.properties
│   ├── config-service/                        # Spring Cloud Config Server (Port 9091)
│   │   ├── Dockerfile
│   │   ├── pom.xml
│   │   └── src/main/java/com/ahmed/configservice/
│   ├── discovery-service/                     # Netflix Eureka Service Registry (Port 8761)
│   │   ├── Dockerfile
│   │   ├── pom.xml
│   │   └── src/main/java/com/ahmed/discoveryservice/
│   ├── gateway-service/                       # Spring Cloud Gateway (Port 8888)
│   │   ├── Dockerfile
│   │   ├── pom.xml
│   │   └── src/main/java/com/ahmed/gatewayservice/
│   ├── reservation-service/                   # Core bookings, catalog, and payments (Port 8090)
│   │   ├── Dockerfile
│   │   ├── pom.xml
│   │   └── src/main/java/com/ahmed/reservationservice/
│   │       ├── config/DataInitializer.java
│   │       ├── controllers/
│   │       │   ├── ActiviteesController.java
│   │       │   ├── AdminDashboardController.java
│   │       │   ├── HebergementsController.java
│   │       │   ├── PaiementsController.java
│   │       │   ├── ReservationController.java
│   │       │   └── TransportsController.java
│   │       ├── DTO/
│   │       ├── feigh/                         # OpenFeign client to user-service (typo in folder name)
│   │       ├── models/
│   │       │   ├── Activitees.java
│   │       │   ├── Hebergements.java
│   │       │   ├── Paiements.java
│   │       │   ├── Reservations.java
│   │       │   └── Transports.java
│   │       └── repositories/
│   └── user-service/                          # User and Administrator management (Port 8081)
│       ├── Dockerfile
│       ├── pom.xml
│       └── src/main/java/com/ahmed/userservice/
│           ├── config/DataInitializer.java
│           ├── controllers/
│           │   ├── adminController.java
│           │   └── userController.java
│           ├── models/
│           │   ├── Administrateurs.java
│           │   └── Utilisateurs.java
│           └── repositories/
├── frontend/                                  # Frontend root
│   └── reservation/                           # Client static application
│       ├── index.html                         # Home page, accommodations search, AI chatbot
│       ├── login.html                         # User login & registration
│       ├── activitees.html                    # Activities catalog & search
│       ├── location.html                      # Car rental search
│       ├── Trains.html                        # Train tickets search
│       ├── Vols.html                          # Flights search
│       ├── Taxis.html                         # Taxi booking search
│       ├── reservationTransport.html          # Booking form & payment modal
│       ├── confimation.html                   # Static booking confirmation
│       ├── css/                               # Client stylesheets
│       ├── image/                             # Client raster & vector media assets
│       └── DACH/                              # Admin dashboard (typo for DASH)
│           ├── loginN.html                    # Admin login page
│           ├── dashOverview.html              # Admin KPI overview & recent activity
│           ├── dashAdmins.html                # Administrator management CRUD
│           ├── dashUsers.html                 # User management CRUD
│           ├── dashHebergements.html          # Accommodations CRUD
│           ├── dashTransport.html             # Transports CRUD
│           ├── dashActivitee.html             # Activities CRUD
│           ├── dashSettings.html              # Admin profile & theme settings
│           ├── admin-layout.js                # Admin sidebar, theme & mock auth gate
│           ├── popup-system.js                # Custom modal & toast popup library
│           └── stylesA-modern.css             # Admin dashboard CSS theme
└── docs/                                      # Audit documentation directory
    └── YUDING_V1_AUDIT_AND_INVENTORY.md       # This comprehensive audit file
```

---

## 3. Backend Services

| Service Name | Port | Directory | Framework / Stack | Database | Main Dependencies | V2 Decision | Rationale |
|---|---|---|---|---|---|---|---|
| **discovery-service** | `8761` | `backend/discovery-service` | Spring Boot 3.4.2, Java 21, Spring Cloud Netflix Eureka | None | `spring-cloud-starter-netflix-eureka-server` | **REPLACE** | Eureka adds substantial memory/operational overhead. In modern containerized V2 deployments (Docker Compose / Kubernetes), DNS-based service discovery is superior. |
| **config-service** | `9091` | `backend/config-service` | Spring Boot 3.4.2, Java 21, Spring Cloud Config | Local Git (`file:///config-repo`) | `spring-cloud-config-server`, `eureka-client` | **REPLACE** | Git-backed config server is currently broken on fresh clones due to missing submodule remote. V2 should use standard environment variables (`.env`) and cloud secret managers. |
| **gateway-service** | `8888` | `backend/gateway-service` | Spring Boot 3.4.2, Java 21, Spring Cloud Gateway | None | `spring-cloud-starter-gateway`, `eureka-client` | **REWRITE** | Gateway configuration allows dangerous `null` origins and exposes direct actuator routes. Must be rewritten in V2 with centralized JWT validation, rate limiting, and unified CORS. |
| **user-service** | `8081` | `backend/user-service` | Spring Boot 3.4.2, Java 21, Spring Data JPA | MySQL 8 (`users_db`) | `spring-boot-starter-data-jpa`, `mysql-connector-j`, `modelmapper` | **REWRITE** | Stores plaintext passwords, lacks authorization, duplicates user/admin entities, and exposes passwords in API responses. Needs complete security overhaul in V2. |
| **reservation-service** | `8090` | `backend/reservation-service` | Spring Boot 3.4.2, Java 21, Spring Data JPA, OpenFeign | MySQL 8 (`reservations_db`) | `spring-boot-starter-data-jpa`, `openfeign`, `mysql-connector-j` | **REWRITE** | Overloaded monolith handling bookings, payments, hotels, flights, cars, and activities. Stores raw credit cards in DB, allows client price tampering. Must be split into domain modules. |
| **commentaire-service** | `8072` | `backend/commentaire-service` | Spring Boot 3.4.2, Java 21, Spring Data JPA | MySQL 8 (`alerts_db`) | `spring-boot-starter-data-jpa`, `mysql-connector-j` | **REWRITE** | Entity is disconnected from bookings or accommodations (no foreign keys). Contains legacy remnants of an alerts service. Should be integrated as a Reviews module in V2. |
| **ai-service** | `7777` | `backend/ai-service` | Spring Boot 3.4.2, Java 21, Spring AI 1.0.0-M5 | PostgreSQL 16 + PgVector (`mydatabase`) | `spring-ai-openai`, `spring-ai-pgvector-store`, `spring-ai-pdf-document-reader` | **REWRITE** | Uses deprecated milestone version (`1.0.0-M5`), GET method with path variable for prompts, re-indexes PDF on every startup, lacks session memory, and leaks historical API keys. |

---

## 4. API Endpoints

### 4.1 Discovery Service (`discovery-service` — Port 8761)
| Method | Endpoint | Controller | Auth | Used By | Issues / Risks | Decision |
|---|---|---|---|---|---|---|
| `GET` | `/` | Eureka UI | None | Browser | Exposes internal microservice network topology and IP addresses to unauthorized visitors. | **DELETE** |
| `GET` | `/actuator/health` | Actuator | None | Docker | Unprotected actuator endpoint. | **KEEP WITH CHANGES** |

### 4.2 Config Service (`config-service` — Port 9091)
| Method | Endpoint | Controller | Auth | Used By | Issues / Risks | Decision |
|---|---|---|---|---|---|---|
| `GET` | `/{app}/{profile}` | ConfigServer | None | Internal Services | Exposes all application secrets (database passwords, API keys) without authentication. | **REPLACE** |
| `GET` | `/actuator/health` | Actuator | None | Docker | Unprotected actuator endpoint. | **KEEP WITH CHANGES** |

### 4.3 Gateway Service (`gateway-service` — Port 8888)
| Method | Route Prefix | Target Service | Auth | Used By | Issues / Risks | Decision |
|---|---|---|---|---|---|---|
| `*` | `/apir/**` | `RESERVATION-SERVICE` | None | Client / Admin | Direct forwarding with zero token validation or rate limiting. | **REWRITE** |
| `*` | `/apiu/**` | `USER-SERVICE` | None | Client / Admin | Direct forwarding with zero token validation or rate limiting. | **REWRITE** |
| `*` | `/apic/**` | `COMMENTAIRE-SERVICE` | None | Client | Direct forwarding with zero token validation or rate limiting. | **REWRITE** |
| `*` | `/ai/**` | `AI-SERVICE` | None | Client Chatbot | Direct forwarding with zero token validation or rate limiting. | **REWRITE** |

### 4.4 AI Service (`ai-service` — Port 7777 / Gateway `/ai/**`)
| Method | Endpoint | Controller | Auth | Used By | Issues / Risks | Decision |
|---|---|---|---|---|---|---|
| `GET` | `/ai/{question}` | `Controller.java` | None | `index.html`, `activitees.html`, `location.html`, `Taxis.html`, `Trains.html`, `Vols.html` | Query sent in path parameter; breaks with special characters (`/`, `?`, `#`); no session memory; unauthenticated. | **REWRITE** |

### 4.5 Commentaire Service (`commentaire-service` — Port 8072 / Gateway `/apic/**`)
| Method | Endpoint | Controller | Auth | Used By | Issues / Risks | Decision |
|---|---|---|---|---|---|---|
| `GET` | `/apic/comments/all` | `CommentaireController` | None | Unused in frontend | Unpaginated list; returns all comments in DB. | **REWRITE** |
| `GET` | `/apic/comments/{id}` | `CommentaireController` | None | Unused | Returns single comment entity. | **REWRITE** |
| `POST` | `/apic/comments/create` | `CommentaireController` | None | `index.html` (typo in HTML: `/creat`) | Anyone can submit arbitrary comments with fake user names and emails. | **REWRITE** |
| `PUT` | `/apic/comments/update/{id}` | `CommentaireController` | None | Unused | Anyone can edit any existing comment (IDOR). | **DELETE** |
| `DELETE` | `/apic/comments/delete/{id}` | `CommentaireController` | None | Unused | Anyone can delete any comment without authorization (IDOR). | **REWRITE** |

### 4.6 User Service (`user-service` — Port 8081 / Gateway `/apiu/**`)
| Method | Endpoint | Controller | Auth | Used By | Issues / Risks | Decision |
|---|---|---|---|---|---|---|
| `GET` | `/apiu/admin/all` | `adminController` | None | `dashAdmins.html` | Exposes all admin accounts INCLUDING PLAINTEXT PASSWORDS to anyone. | **REWRITE** |
| `GET` | `/apiu/admin/{id}` | `adminController` | None | Unused | Exposes single admin entity with plaintext password. | **REWRITE** |
| `POST` | `/apiu/admin/create` | `adminController` | None | `dashAdmins.html` | Unauthenticated visitor can create super-admin accounts with plaintext passwords. | **REWRITE** |
| `PUT` | `/apiu/admin/update/{id}` | `adminController` | None | `dashAdmins.html`, `dashSettings.html` | Anyone can update any admin's password and credentials (IDOR). | **REWRITE** |
| `DELETE` | `/apiu/admin/delete/{id}` | `adminController` | None | `dashAdmins.html` | Anyone can delete all administrators without logging in. | **REWRITE** |
| `POST` | `/apiu/admin/search` | `adminController` | None | `loginN.html` | Searches by plaintext email and password via query parameters; returns full admin entity with password. | **REWRITE** |
| `GET` | `/apiu/utilisateurs/all` | `userController` | None | `dashUsers.html` | Returns all registered users with plaintext passwords, phone numbers, and emails. | **REWRITE** |
| `POST` | `/apiu/utilisateurs/create` | `userController` | None | `login.html` | Public user registration; stores password in plaintext; does not check for duplicate emails/usernames. | **REWRITE** |
| `PUT` | `/apiu/utilisateurs/update/{id}` | `userController` | None | Unused | Unprotected endpoint allowing modification of any user's profile. | **REWRITE** |
| `DELETE` | `/apiu/utilisateurs/delete/{id}` | `userController` | None | `dashUsers.html` | Unauthenticated delete of any user account (IDOR). | **REWRITE** |
| `PUT` | `/apiu/utilisateurs/status/{id}` | `userController` | None | Unused | Unprotected status update endpoint (`ACTIVE`, `INACTIVE`). | **REWRITE** |
| `POST` | `/apiu/utilisateurs/search` | `userController` | None | `login.html` | Verifies plaintext username and password; returns full user entity with plaintext password. | **REWRITE** |
| `GET` | `/apiu/utilisateurs/id/{id}` | `userController` | None | `reservationTransport.html`, OpenFeign | Returns complete user record with password; unauthenticated. | **REWRITE** |
| `POST` | `/apiu/utilisateurs/{username}` | `userController` | None | Unused | Uses `POST` for a read lookup; returns user by username. | **DELETE** |

### 4.7 Reservation Service (`reservation-service` — Port 8090 / Gateway `/apir/**`)
| Method | Endpoint | Controller | Auth | Used By | Issues / Risks | Decision |
|---|---|---|---|---|---|---|
| `GET` | `/apir/admin/stats` | `AdminDashboardController` | None | `dashOverview.html` | Unauthenticated business metrics exposure (total revenue, count of bookings). | **REWRITE** |
| `GET` | `/apir/admin/recent-reservations` | `AdminDashboardController` | None | `dashOverview.html` | Exposes recent bookings to unauthenticated callers. | **REWRITE** |
| `GET` | `/apir/admin/recent-payments` | `AdminDashboardController` | None | `dashOverview.html` | Exposes recent payments with credit card numbers to unauthenticated callers. | **REWRITE** |
| `GET` | `/apir/paiements/all` | `PaiementsController` | None | Unused | Exposes entire credit card database table. Critical PCI-DSS breach. | **DELETE** |
| `GET` | `/apir/paiements/{id}` | `PaiementsController` | None | Unused | Exposes individual card numbers and CVVs. | **DELETE** |
| `POST` | `/apir/paiements/create` | `PaiementsController` | None | `reservationTransport.html` | Receives raw PAN and CVV over unencrypted HTTP; stores them in DB; no actual charge made. | **REPLACE** |
| `PUT` | `/apir/paiements/update/{id}` | `PaiementsController` | None | Unused | Allows modifying payment amounts or card details after creation. | **DELETE** |
| `DELETE` | `/apir/paiements/delete/{id}` | `PaiementsController` | None | Unused | Allows deleting payment audit logs. | **DELETE** |
| `GET` | `/apir/reservations/apiu/utilisateurs/id/{id}` | `ReservationController` | None | Unused | Redundant proxy route forwarding to Feign client. | **DELETE** |
| `GET` | `/apir/reservations/all` | `ReservationController` | None | Unused | Returns all reservations in database without pagination or auth. | **REWRITE** |
| `GET` | `/apir/reservations/id/{id}` | `ReservationController` | None | Unused | Unprotected reservation lookup by ID. | **REWRITE** |
| `POST` | `/apir/reservations/create/{idu}` | `ReservationController` | None | `reservationTransport.html` | Accepts client-calculated `prixtot` without server verification; accepts arbitrary `idu` in path. | **REWRITE** |
| `PUT` | `/apir/reservations/update/{id}` | `ReservationController` | None | Unused | Unprotected update of reservation dates, prices, and relations. | **REWRITE** |
| `DELETE` | `/apir/reservations/delete/{id}` | `ReservationController` | None | Unused | Unprotected cancellation/deletion of reservations. | **REWRITE** |
| `GET` | `/apir/reservations/{id}` | `ReservationController` | None | Unused | Aggregates reservation and Feign user info into DTO. | **REWRITE** |
| `GET` | `/apir/hebergements/all` | `HebergementsController` | None | `dashHebergements.html` | Returns full accommodations catalog. | **REWRITE** |
| `GET` | `/apir/hebergements/{id}` | `HebergementsController` | None | `dashHebergements.html` | Returns accommodation by ID. | **REWRITE** |
| `POST` | `/apir/hebergements/create` | `HebergementsController` | None | `dashHebergements.html` | Unauthenticated creation of accommodations. | **REWRITE** |
| `PUT` | `/apir/hebergements/update/{id}` | `HebergementsController` | None | `dashHebergements.html` | Unauthenticated modification of accommodations. | **REWRITE** |
| `DELETE` | `/apir/hebergements/delete/{id}` | `HebergementsController` | None | `dashHebergements.html` | Unauthenticated deletion of accommodations. | **REWRITE** |
| `POST` | `/apir/hebergements/search` | `HebergementsController` | None | `index.html` | `POST` used for search with query params (`pays`, `ville`). Returns 404 if empty instead of empty array. | **REWRITE** |
| `GET` | `/apir/transports/all` | `TransportsController` | None | `dashTransport.html` | Returns entire transport catalog. | **REWRITE** |
| `GET` | `/apir/transports/{id}` | `TransportsController` | None | `dashTransport.html` | Returns transport item by ID. | **REWRITE** |
| `POST` | `/apir/transports/create` | `TransportsController` | None | `dashTransport.html` | Unauthenticated creation of transports. | **REWRITE** |
| `PUT` | `/apir/transports/update/{id}` | `TransportsController` | None | `dashTransport.html` | Unauthenticated update of transports. | **REWRITE** |
| `DELETE` | `/apir/transports/delete/{id}` | `TransportsController` | None | `dashTransport.html` | Unauthenticated deletion of transports. | **REWRITE** |
| `POST` | `/apir/transports/search/ville` | `TransportsController` | None | `location.html` | Hardcoded server filter for `type_transport == "Location"`. | **REWRITE** |
| `POST` | `/apir/transports/search` | `TransportsController` | None | Unused | General transport search by `pays`, `lieudepp`, `lieuarr`. | **REWRITE** |
| `POST` | `/apir/transports/search1` | `TransportsController` | None | `Vols.html` | Inconsistent endpoint naming (`search1`); filters for `type_transport == "Avion"`. | **REWRITE** |
| `POST` | `/apir/transports/search2` | `TransportsController` | None | `Taxis.html` | Inconsistent endpoint naming (`search2`); filters for `type_transport == "Taxi"`. | **REWRITE** |
| `POST` | `/apir/transports/search3` | `TransportsController` | None | `Trains.html` | Inconsistent endpoint naming (`search3`); filters for `type_transport == "Train"`. | **REWRITE** |
| `GET` | `/apir/activities/all` | `ActiviteesController` | None | `dashActivitee.html` | Returns all activities. | **REWRITE** |
| `GET` | `/apir/activities/{id}` | `ActiviteesController` | None | Unused | Returns activity by ID. | **REWRITE** |
| `POST` | `/apir/activities/create` | `ActiviteesController` | None | `dashActivitee.html` | Unauthenticated creation of activities. | **REWRITE** |
| `PUT` | `/apir/activities/update/{id}` | `ActiviteesController` | None | `dashActivitee.html` | Unauthenticated update of activities. | **REWRITE** |
| `DELETE` | `/apir/activities/{id}` | `ActiviteesController` | None | `dashActivitee.html` | Inconsistent route: lacks `/delete/` prefix unlike all other delete routes. | **REWRITE** |
| `POST` | `/apir/activities/search1` | `ActiviteesController` | None | `activitees.html` | Inconsistent route name (`search1`); searches by `pays` and `ville`. | **REWRITE** |
| `POST` | `/apir/activities/search` | `ActiviteesController` | None | Unused | Searches activities by `pays`, `ville`, and `date`. | **REWRITE** |

---

## 5. Database Inventory

### 5.1 Databases Summary
1. **`users_db` (MySQL 8):**
   - **Host:** `mysql-dock:3306`
   - **User:** `root` (no password)
   - **Service:** `user-service`
   - **DDL Mode:** `update` (Hibernate creates/modifies tables automatically)
   - **Volume:** Backed by `mysql-data` named Docker volume.
2. **`reservations_db` (MySQL 8):**
   - **Host:** `mysql-dock:3306`
   - **User:** `root` (no password)
   - **Service:** `reservation-service`
   - **DDL Mode:** `update`
   - **Volume:** Backed by `mysql-data` named Docker volume.
3. **`alerts_db` (MySQL 8):**
   - **Host:** `mysql-dock:3306`
   - **User:** `root` (no password)
   - **Service:** `commentaire-service`
   - **DDL Mode:** `update`
   - **Volume:** Backed by `mysql-data` named Docker volume.
4. **`mydatabase` (PostgreSQL 16 with pgvector):**
   - **Host:** `pgvector-dock:5432`
   - **User:** `myuser` (password: `secret`)
   - **Service:** `ai-service`
   - **Volume:** **NONE** (ephemeral container storage; all embeddings are lost when the container is recreated).

---

## 6. Entities & Relationships

### 6.1 Entity Details
| Entity / Table | Service | Primary Key | Important Fields | Data Types & Flaws | Sensitive Fields | V2 Decision |
|---|---|---|---|---|---|---|
| `Utilisateurs` (`utilisateurs`) | `user-service` | `idu` (Long) | `nom_utilisateur`, `prenom_utilisateur`, `email_utilisateur`, `date_naissance`, `pays`, `genre`, `password`, `username`, `num_tele`, `status`, `createdAt` | `idu` violates standard ID naming; `password` stored in plaintext. | `password`, `email_utilisateur`, `num_tele`, `date_naissance` | **REWRITE** |
| `Administrateurs` (`administrateurs`) | `user-service` | `id_admin` (Long) | `nom`, `prenom`, `email`, `naissance`, `pays`, `genre`, `password`, `tele` | Duplicates user concepts; `naissance` is `java.sql.Date`; `tele` is `Long` (inconsistent with user `String`); `password` in plaintext. | `password`, `email`, `tele` | **REWRITE** |
| `Hebergements` (`HEBERGEMENTS`) | `reservation-service` | `id_hebergement` (Long) | `nom_hebergement`, `type_hebergement`, `adresseHebergement`, `desc_hebergement`, `prix_hebergement`, `capacite_hebergement`, `nom_fournisseur`, `tele_fournisseur`, `ville`, `pays`, `photo_hebergament` | `prix_hebergement` is `float` (rounding errors); `photo_hebergament` has typo (`a` instead of `e`); `tele_fournisseur` is `Long`. | Supplier phone numbers | **REWRITE** |
| `Transports` (`TRANSPORTS`) | `reservation-service` | `idt` (Long) | `type_transport`, `desc_transport`, `compagnie`, `lieudepp`, `lieuarr`, `adresse`, `marque`, `prix_transport`, `nom_fournisseur`, `tele_fournisseur`, `pays`, `ville`, `paysarr`, `villearr`, `photo` | `prix_transport` is `float`; `@Column(name="tele_fournisseu")` has column typo without `r`; fields overload 4 incompatible transport modes (plane, train, taxi, car rental) into one table with dozens of nullable fields. | None | **REWRITE** |
| `Activitees` (`activitees`) | `reservation-service` | `ida` (Long) | `nom_activitee`, `prix_activitee`, `ville`, `desc_activitee`, `duree`, `nom_fournisseur`, `pays`, `date`, `tele_fournisseur`, `photo` | `duree` stored as `String` (e.g. "2 heures"); `prix_activitee` is `Double`. Typo in table name (`activitees`). | None | **REWRITE** |
| `Reservations` (`RESERVATIONS`) | `reservation-service` | `idr` (Long) | `date`, `duree`, `ida`, `idt`, `id_hebergement`, `prixtot`, `nombrepersonne`, `idu` | `nombrepersonne` is `Double` (allows fractional humans); `prixtot` is `Double`; `idu` is loose cross-database foreign key without DB constraint. Missing booking state machine. | Links user to booking | **REWRITE** |
| `Paiements` (`PAIEMENTS`) | `reservation-service` | `id_paiement` (Long) | `idr`, `prixtot`, `modepaiement`, `numcarte`, `date`, `cvv` | `@Column(name=" numcarte")` has accidental leading space; raw PAN and CVV stored in plaintext. `idr` is loose column without JPA relation. | `numcarte`, `cvv` (Critical PCI breach) | **DELETE & REPLACE** |
| `Commentaires` (`commentaires`) | `commentaire-service` | `id_comment` (Long) | `contenu`, `dateHeureComment`, `username`, `email` | Completely detached from items being commented on (no relation to hotel/activity). Unverified string usernames and emails. | Email | **REWRITE** |

### 6.2 Data Model Relationship Map
```text
[users_db]
  Utilisateurs (idu) <------------------------+  (Loose reference via Feign / HTTP)
                                              |
[reservations_db]                             |
  Reservations (idr) -------------------------+
    ├── ManyToOne ──> Hebergements (id_hebergement)
    ├── ManyToOne ──> Transports (idt)
    └── ManyToOne ──> Activitees (ida)
  
  Paiements (id_paiement) 
    └── (Loose column: idr) ──> Reservations (idr)  (No JPA or foreign key constraint)

[alerts_db]
  Commentaires (id_comment) (Completely isolated; no relations to anything)
```

---

## 7. Frontend Pages (Client)

| Page | Filename | Purpose | Endpoints Called | Client State Used | Main Problems | V2 Decision |
|---|---|---|---|---|---|---|
| **Home / Accommodations** | `index.html` | Showcase platform, search hotels/riads, submit comments, interact with AI assistant | `POST /apir/hebergements/search`, `POST /apic/comments/create`, `GET /ai/{question}` | `localStorage.getItem('theme')`, `sessionStorage.getItem('isLoggedIn')`, `sessionStorage.getItem('userId')` | Hardcoded markup, duplicated inline scripts, unescaped `innerHTML` rendering in chatbot and results, duplicate form action attribute. | **REPLACE** (Next.js page) |
| **Authentication** | `login.html` | User registration and login | `POST /apiu/utilisateurs/create`, `POST /apiu/utilisateurs/search` | `sessionStorage.setItem('isLoggedIn')`, `sessionStorage.setItem('userId')` | Plaintext passwords sent in request, entire user profile logged to browser console, zero token storage, no email validation. | **REPLACE** (Next.js auth) |
| **Activities** | `activitees.html` | Browse and filter local activities | `POST /apir/activities/search1`, `GET /ai/{question}` | `localStorage.getItem('theme')`, `sessionStorage.getItem('userId')` | Form action points directly to microservice port `8090` bypassing Gateway; inline jQuery search logic; XSS in results container. | **REPLACE** (Next.js catalog) |
| **Car Rental** | `location.html` | Search and filter rental vehicles | `POST /apir/transports/search/ville`, `GET /ai/{question}` | `localStorage.getItem('theme')`, `sessionStorage.getItem('userId')` | Inefficient search endpoint, unescaped HTML concatenation, passing `userId` via query string to next page. | **REPLACE** (Next.js catalog) |
| **Trains** | `Trains.html` | Search train journeys | `POST /apir/transports/search3`, `GET /ai/{question}` | `localStorage.getItem('theme')`, `sessionStorage.getItem('userId')` | Inconsistent endpoint naming (`search3`), static mocked train data, insecure query params. | **REPLACE** (Next.js catalog) |
| **Flights** | `Vols.html` | Search flights | `POST /apir/transports/search1`, `GET /ai/{question}` | `localStorage.getItem('theme')`, `sessionStorage.getItem('userId')` | Inconsistent endpoint naming (`search1`), static mock flight inventory, client-side URL parameters. | **REPLACE** (Next.js catalog) |
| **Taxis** | `Taxis.html` | Book city taxis | `POST /apir/transports/search2`, `GET /ai/{question}` | `localStorage.getItem('theme')`, `sessionStorage.getItem('userId')` | Inconsistent endpoint naming (`search2`), mocked data, duplicate inline scripts. | **REPLACE** (Next.js catalog) |
| **Booking & Checkout** | `reservationTransport.html` | Fill reservation parameters and input credit card details | `GET /apiu/utilisateurs/id/{id}`, `POST /apir/reservations/create/{idu}`, `POST /apir/paiements/create` | `sessionStorage.getItem('userId')`, `sessionStorage.setItem('currentReservationId')` | Hardcodes price calculation to `100 * duree * persons` in browser JS; captures raw credit card numbers and CVV over HTTP; submits raw card data to backend. | **REPLACE** (Next.js + Stripe) |
| **Confirmation** | `confimation.html` | Booking success landing page (notice typo in filename) | None | `localStorage.getItem('theme')` | Completely static; displays no reservation details, no price, no confirmation number; falsely promises email notification. | **REPLACE** (Next.js receipt) |

---

## 8. Admin Frontend (`frontend/reservation/DACH/`)

| Admin Page | Function / CRUD | Endpoints Called | Auth Model | Security Risks | V2 Decision |
|---|---|---|---|---|---|
| **Login** (`loginN.html`) | Admin credential submission | `POST /apiu/admin/search` | Form POST with email/password query params | Plaintext credentials sent over HTTP; full admin entity with password stored in `localStorage.adminUser`. | **REPLACE** |
| **Overview** (`dashOverview.html`) | View high-level metrics & recent bookings/payments | `GET /apir/admin/stats`, `GET /apir/admin/recent-reservations`, `GET /apir/admin/recent-payments` | `admin-layout.js` checks `localStorage.adminUser` | Trivial client-side auth bypass (`localStorage.setItem('adminUser', '{}')`); exposes recent credit card numbers and revenue to any visitor. | **REPLACE** (Next.js Admin) |
| **Admins** (`dashAdmins.html`) | Create, update, delete administrators | `GET /apiu/admin/all`, `POST /apiu/admin/create`, `PUT /apiu/admin/update/{id}`, `DELETE /apiu/admin/delete/{id}` | Client-only gate | Plaintext passwords displayed in table DOM; unauthenticated delete of administrators; XSS in table rendering. | **REPLACE** (Next.js Admin) |
| **Users** (`dashUsers.html`) | View registered users and delete accounts | `GET /apiu/utilisateurs/all`, `DELETE /apiu/utilisateurs/delete/{id}` | Client-only gate | Exposes all user PII and plaintext passwords; unauthenticated delete; unescaped `innerHTML` injection. | **REPLACE** (Next.js Admin) |
| **Accommodations** (`dashHebergements.html`) | CRUD accommodations | `GET /apir/hebergements/all`, `POST /apir/hebergements/create`, `PUT /apir/hebergements/update/{id}`, `DELETE /apir/hebergements/delete/{id}` | Client-only gate | Unauthenticated write/delete; XSS in table generation; file uploads not backed by storage. | **REPLACE** (Next.js Admin) |
| **Transports** (`dashTransport.html`) | CRUD transports | `GET /apir/transports/all`, `POST /apir/transports/create`, `PUT /apir/transports/update/{id}`, `DELETE /apir/transports/delete/{id}` | Client-only gate | Unauthenticated write/delete; XSS in table generation; jQuery DOM string concatenation. | **REPLACE** (Next.js Admin) |
| **Activities** (`dashActivitee.html`) | CRUD activities | `GET /apir/activities/all`, `POST /apir/activities/create`, `PUT /apir/activities/update/{id}`, `DELETE /apir/activities/{id}`, `GET /apir/reservations/activitee/{ida}` | Client-only gate | Calls non-existent endpoint `/apir/reservations/activitee/{ida}` causing 404 on delete checks; unauthenticated write/delete. | **REPLACE** (Next.js Admin) |
| **Settings** (`dashSettings.html`) | Edit logged-in admin profile & theme | `PUT /apiu/admin/update/{id}` | Reads cached admin ID from `localStorage` | Allows updating any admin ID; stores updated plaintext password directly back into `localStorage`. | **REPLACE** (Next.js Admin) |

---

## 9. Frontend Security Risks & Sinks

### 9.1 DOM Sinks (XSS)
| File | Sink Location | Data Source | Vulnerability Type | Severity |
|---|---|---|---|---|
| `frontend/reservation/index.html` | Line 612: `userMessageDiv.innerHTML = ...` | User input `#userInput` | Reflected DOM XSS | **HIGH** |
| `frontend/reservation/index.html` | Line 650: `assistantMessageDiv.innerHTML = ...` | AI response from `http://localhost:8888/ai/...` | AI Output / Stored XSS | **HIGH** |
| `frontend/reservation/index.html` | Line 453: `$('#results-container').html(html)` | Backend API response (`nom_hebergement`, `desc_hebergement`) | Stored XSS | **HIGH** |
| `frontend/reservation/activitees.html` | Line 176 & 390: `$('#results-container').html(html)` | Backend API response (`nom_activitee`, `desc_activitee`) | Stored XSS | **HIGH** |
| `frontend/reservation/location.html` | Line 216: `$('#results-container').html(html)` | Backend API response (`compagnie`, `marque`) | Stored XSS | **HIGH** |
| `frontend/reservation/Trains.html` | Line 208: `$('#results-container').html(html)` | Backend API response (`compagnie`, `desc_transport`) | Stored XSS | **HIGH** |
| `frontend/reservation/Vols.html` | Line 213: `$('#results-container').html(html)` | Backend API response (`compagnie`, `desc_transport`) | Stored XSS | **HIGH** |
| `frontend/reservation/Taxis.html` | Line 208: `$('#results-container').html(html)` | Backend API response (`compagnie`, `desc_transport`) | Stored XSS | **HIGH** |
| `frontend/reservation/DACH/dashUsers.html` | Line 233: `row.innerHTML = ...` | Backend API response (`nom_utilisateur`, `email_utilisateur`) | Stored XSS in Admin | **CRITICAL** |
| `frontend/reservation/DACH/dashAdmins.html` | Line 238: `row.innerHTML = ...` | Backend API response (`nom`, `prenom`, `email`) | Stored XSS in Admin | **CRITICAL** |
| `frontend/reservation/DACH/dashOverview.html` | Line 202 & 223: `row.innerHTML = ...` | Backend API response (recent reservations & payments) | Stored XSS in Admin | **HIGH** |
| `frontend/reservation/DACH/dashHebergements.html` | Line 524: `tbody.innerHTML += row` | Backend API response (`nom_hebergement`) | Stored XSS in Admin | **HIGH** |
| `frontend/reservation/DACH/dashTransport.html` | Line 521: `tableBody.append(...)` | Backend API response (`compagnie`, `desc_transport`) | Stored XSS in Admin | **HIGH** |

### 9.2 Insecure Client Storage & Secrets
* **`sessionStorage.userId`:** The application relies on an unverified numeric `userId` stored in `sessionStorage`. An attacker can alter this to any integer and make bookings under another user's name.
* **`localStorage.adminUser`:** The complete admin entity, including plaintext password, is stored directly in browser local storage.
* **`console.log` Exposure:** `login.html` (lines 211-213) logs the complete user object containing the plaintext password to the browser developer console.

---

## 10. Frontend External Dependencies

| Library / Resource | Version | Source URL | SRI Present | Purpose | V2 Action |
|---|---|---|---|---|---|
| **jQuery** | `3.6.0` | `https://code.jquery.com/jquery-3.6.0.min.js` | **NO** | DOM manipulation, AJAX calls | **DELETE** (Replaced by React / Next.js) |
| **Font Awesome** | `6.4.2` | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css` | **NO** | Vector icons | **REPLACE** (`lucide-react`) |
| **Font Awesome (Legacy)** | `5.15.3` | `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css` | **NO** | Icons in `login.html` and `loginN.html` | **DELETE** |
| **Emoji Mart** | `@latest` (unpinned!) | `https://cdn.jsdelivr.net/npm/emoji-mart@latest/dist/browser.js` | **NO** | Chatbot emoji picker | **DELETE** / **REPLACE** |
| **Google Fonts (Poppins)** | Unversioned | `https://fonts.googleapis.com/css2?family=Poppins:...` | N/A | Typography | **REPLACE** (`next/font`) |
| **Google Fonts (Montserrat)** | Unversioned | `https://fonts.googleapis.com/css2?family=Montserrat:...` | N/A | Typography | **REPLACE** (`next/font`) |
| **Google Fonts (Space Grotesk)** | Unversioned | `https://fonts.googleapis.com/css2?family=Space+Grotesk:...` | N/A | Typography in login pages | **REPLACE** (`next/font`) |
| **Material Symbols** | Unversioned | `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined...` | N/A | Chatbot icon fonts | **DELETE** |

---

## 11. Maven / Java Dependencies

| Dependency | GroupId : ArtifactId | Versions in V1 | Services Using It | Vulnerability / Concern | V2 Decision |
|---|---|---|---|---|---|
| **Spring Boot Parent** | `org.springframework.boot:spring-boot-starter-parent` | `3.4.2` | All 7 services | Current stable version | **KEEP WITH UPGRADES** |
| **Spring Cloud** | `org.springframework.cloud:spring-cloud-dependencies` | `2024.0.0` | All 7 services | Current release train | **KEEP WITH CHANGES** |
| **Spring AI** | `org.springframework.ai:spring-ai-bom` | `1.0.0-M5` | `ai-service` | Milestone pre-release; breaking changes exist in newer releases | **REWRITE / UPGRADE** |
| **Eureka Server** | `spring-cloud-starter-netflix-eureka-server` | `2024.0.0` | `discovery-service` | High memory footprint; Netflix OSS maintenance mode | **REPLACE** (Container DNS) |
| **Eureka Client** | `spring-cloud-starter-netflix-eureka-client` | `2024.0.0` | 6 services | High resource usage | **REPLACE** |
| **Config Server** | `spring-cloud-config-server` | `2024.0.0` | `config-service` | Local Gitlink issue; unauthenticated endpoints | **REPLACE** (Environment files) |
| **Spring Cloud Gateway** | `spring-cloud-starter-gateway` | `2024.0.0` | `gateway-service` | Reactive Netty gateway; needs security filter chain | **KEEP WITH CHANGES** |
| **OpenFeign** | `spring-cloud-starter-openfeign` | `2024.0.0` | `reservation-service` | Synchronous microservice coupling | **KEEP WITH CHANGES** |
| **Spring Security** | `spring-boot-starter-security` | **ABSENT** | **None** | Completely missing from all services | **ADD IN V2** |
| **MySQL Connector** | `com.mysql:mysql-connector-j` | Managed (9.x) | `user`, `reservation`, `commentaire` | Production relational storage | **REPLACE** (`postgresql`) |
| **PgVector Starter** | `spring-ai-pgvector-store-spring-boot-starter` | `1.0.0-M5` | `ai-service` | Embedding storage | **KEEP WITH CHANGES** |
| **ModelMapper** | `org.modelmapper:modelmapper` | `3.1.1` | `user-service` | Reflection-based mapping overhead | **REPLACE** (`MapStruct`) |
| **Lombok** | `org.projectlombok:lombok` | `1.18.36` | 4 services | Boilerplate reduction | **KEEP** |

---

## 12. Docker Infrastructure

| Container Name | Image / Build Context | Host Port | Container Port | Volume Mount | Depends On | Security & Operational Risks |
|---|---|---|---|---|---|---|
| **`pgvector-dock`** | `pgvector/pgvector:pg16` | `5432` | `5432` | **None** | None | Publicly exposed port; default password `secret`; **no persistent volume** (data lost on container recreation). |
| **`mysql-dock`** | `mysql:8` | `3306` | `3306` | `mysql-data:/var/lib/mysql` | None | Publicly exposed port; `MYSQL_ALLOW_EMPTY_PASSWORD=yes` (blank root password); critical vulnerability. |
| **`phpmyadmin-dock`** | `phpmyadmin/phpmyadmin:latest` | `8080` | `80` | None | `mysql` | Publicly exposed database admin UI with root user and empty password. |
| **`discovery-dock`** | `./backend/discovery-service` | `8761` | `8761` | None | None | Publicly exposed Eureka dashboard exposing microservice IP topology. |
| **`config-dock`** | `./backend/config-service` | `9091` | `9091` | `./backend/config-repo:/config-repo` | `discovery-service` | Publicly exposed config server; fails if `./backend/config-repo` is not populated. |
| **`user-dock`** | `./backend/user-service` | `8081` | `8081` | None | `config-service`, `mysql` | Directly exposed microservice bypassing Gateway. |
| **`commentaire-dock`** | `./backend/commentaire-service` | `8072` | `8072` | None | `config-service`, `mysql` | Directly exposed microservice bypassing Gateway. |
| **`ai-dock`** | `./backend/ai-service` | `7777` | `7777` | None | `pgvector`, `config-service` | Directly exposed microservice bypassing Gateway. |
| **`reservation-dock`** | `./backend/reservation-service` | `8090` | `8090` | None | `config-service`, `user-service`, `mysql` | Directly exposed microservice bypassing Gateway. |
| **`gateway-dock`** | `./backend/gateway-service` | `8888` | `8888` | None | `reservation-service` | Public entry point; all other backend services are also publicly reachable on host ports. |

### Docker Architecture Deficiencies:
1. **No Multi-Stage Builds:** Dockerfiles use `COPY target/*.jar app.jar`, forcing developers to run `mvn clean package` on the host prior to executing `docker compose build`.
2. **Container Run-as-Root:** All containers execute Java processes as the `root` superuser.
3. **No Network Segregation:** All containers run on the default bridge network with public host port forwarding enabled for internal databases and microservices.

---

## 13. Complete Port Inventory

| Port | Component | Source Location | Public / Internal | Conflict / Risk Level |
|---|---|---|---|---|
| **`3306`** | MySQL Database | `docker-compose.yml`, properties | Publicly exposed | **CRITICAL** (Blank root password, accessible externally). |
| **`5432`** | PostgreSQL (pgvector) | `docker-compose.yml`, properties | Publicly exposed | **HIGH** (Hardcoded password `secret`, accessible externally). |
| **`7777`** | AI Service | `docker-compose.yml`, `application.properties` | Publicly exposed | **HIGH** (Bypasses Gateway; unauthenticated prompt execution). |
| **`8072`** | Commentaire Service | `docker-compose.yml`, `application.properties` | Publicly exposed | **HIGH** (Bypasses Gateway; direct comment modification). |
| **`8080`** | phpMyAdmin | `docker-compose.yml` | Publicly exposed | **CRITICAL** (Web DB admin tool with blank password). |
| **`8081`** | User Service | `docker-compose.yml`, `application.properties` | Publicly exposed | **CRITICAL** (Bypasses Gateway; direct user/admin database tampering). |
| **`8090`** | Reservation Service | `docker-compose.yml`, `activitees.html` | Publicly exposed | **CRITICAL** (Bypasses Gateway; frontend directly submits to port 8090). |
| **`8761`** | Eureka Discovery | `docker-compose.yml`, `application.properties` | Publicly exposed | **MEDIUM** (Exposes internal microservice architecture). |
| **`8888`** | Spring Cloud Gateway | `docker-compose.yml`, `application.properties` | Public entry point | **LOW** (Intended primary external port). |
| **`9091`** | Config Server | `docker-compose.yml`, `application.properties` | Publicly exposed | **HIGH** (Exposes all centralized configuration and secrets). |
| **`63342`** | IntelliJ / WebStorm IDE | `gateway-service` CORS config | Internal development | **MEDIUM** (IDE-specific origin hardcoded into production gateway). |

---

## 14. Configuration Inventory

### 14.1 Configuration Sources
1. **Local properties (`backend/*/src/main/resources/application.properties`):**
   - Configures application name, local port, Actuator exposure, and Config Server import (`optional:configserver:${CONFIG_SERVICE_URL:http://localhost:9091}`).
2. **Centralized Config Repo (`backend/config-repo/*.properties`):**
   - Stores datasource URLs, usernames, blank passwords, Hibernate dialects (`MySQL8Dialect`), `ddl-auto=update`, and logging levels (`DEBUG`).
3. **Environment Overrides (`docker-compose.yml`):**
   - Injects `DISCOVERY_SERVICE_URL` and `CONFIG_SERVICE_URL`.

### 14.2 Production-Unsuitable Settings
* `spring.jpa.hibernate.ddl-auto=update` across all services (causes uncontrolled schema mutations in production).
* `spring.jpa.show-sql=true` enabled globally (clutters logs with high volume of query output).
* `logging.level.com.example=DEBUG` enabled in centralized configuration.
* `management.endpoints.web.exposure.include=*` exposing Actuator `env`, `heapdump`, and `beans` endpoints.

---

## 15. Environment Variables Inventory

| Variable | Used By | Purpose | Secret? | Default Value | V2 Action |
|---|---|---|---|---|---|
| `DISCOVERY_SERVICE_URL` | Microservices, Gateway | Eureka registry URL | No | `http://discovery-dock:8761/eureka` | **REMOVE** (Use container DNS) |
| `CONFIG_SERVICE_URL` | Microservices | Config Server URL | No | `http://config-dock:9091` | **REMOVE** (Use `.env` files) |
| `MYSQL_ALLOW_EMPTY_PASSWORD` | `mysql` container | Permits blank root password | Yes | `yes` | **REMOVE / ENFORCE SECURE PASSWORDS** |
| `POSTGRES_DB` | `pgvector` container | Database name | No | `mydatabase` | **RETAIN WITH CONFIG** |
| `POSTGRES_USER` | `pgvector` container | Database username | No | `myuser` | **CONFIGURE VIA .ENV** |
| `POSTGRES_PASSWORD` | `pgvector` container | Database password | **YES** | `secret` | **MASK & INJECT VIA SECRETS** |
| `PMA_HOST` | `phpmyadmin` container | Target MySQL host | No | `mysql` | **REMOVE PHPMYADMIN** |
| `PMA_USER` | `phpmyadmin` container | MySQL login user | No | `root` | **REMOVE PHPMYADMIN** |
| `PMA_PASSWORD` | `phpmyadmin` container | MySQL login password | **YES** | `""` (empty) | **REMOVE PHPMYADMIN** |
| `OPENAI_API_KEY` | `ai-service` | OpenAI model authentication | **YES** | Leaked in git: `sk-proj-pOmZ****` | **ROTATE & INJECT VIA SECRETS** |

---

## 16. External APIs & Third-Party Integrations

1. **OpenAI API (`gpt-4o-mini`):**
   - **Provider:** OpenAI
   - **Used By:** `ai-service`
   - **Authentication:** Bearer API key (`spring.ai.openai.api-key`)
   - **Historical Secret Leak:** In Git commit `69ba7e6b30eb412ae09dfa5631f7b91727f410e8` in `backend/config-repo`, a valid OpenAI API key (`sk-proj-pOmZ****`) was committed directly to source control before being replaced with a placeholder string (`ajouter_votre_apikey`).
   - **V2 Action:** Rotate key immediately; load strictly from environment variables.
2. **External Travel Providers (Flights, Hotels, Trains, Cars):**
   - **Current Status:** **COMPLETELY ABSENT.** Yuding V1 contains zero integration with Amadeus, Sabre, Skyscanner, Booking.com, or ONCF. All search results and travel listings are static rows manually seeded into the MySQL database via `DataInitializer.java`.
   - **V2 Action:** Integrate official travel aggregators (Amadeus API for flights, Booking.com/Expedia for hotels).
3. **Payment Service Provider (PSP):**
   - **Current Status:** **COMPLETELY ABSENT.** No Stripe, PayPal SDK, or Adyen integration exists.
   - **V2 Action:** Integrate Stripe Elements and webhook verification.

---

## 17. Authentication & Session Flow Audit

```text
[CLIENT LOGIN FLOW]
1. User enters credentials on login.html (#username, #password).
2. jQuery sends plaintext credentials:
   POST http://localhost:8888/apiu/utilisateurs/search (username=..., password=...)
3. Backend userController.getUtilisateurByUsernameAndPassword() queries:
   SELECT * FROM utilisateurs WHERE username = ? AND password = ?
4. Backend returns the entire Utilisateurs entity (including plaintext password) in JSON body.
5. Browser script logs entire user object to console:
   console.log("Réponse complète du serveur:", response);
6. Browser executes:
   sessionStorage.setItem('isLoggedIn', 'true');
   sessionStorage.setItem('userId', response.idu);
7. Subsequent pages read sessionStorage.getItem('userId') and pass it in URL query parameters!
```

```text
[ADMIN LOGIN FLOW]
1. Admin enters credentials on DACH/loginN.html (#email, #password).
2. jQuery sends:
   POST http://localhost:8888/apiu/admin/search?email=...&password=...
3. Backend adminController.findByEmailAndPassword() queries:
   SELECT * FROM administrateurs WHERE email = ? AND password = ?
4. Backend returns entire Administrateurs entity (including plaintext password) in JSON.
5. Browser stores complete entity in localStorage:
   localStorage.setItem('adminUser', JSON.stringify(response));
6. Admin dashboard pages load admin-layout.js which executes:
   if (!localStorage.getItem('adminUser')) window.location.href = 'loginN.html';
```

### Weaknesses & Exploits:
* **Zero Cryptographic Protection:** No bcrypt, Argon2, or PBKDF2 password hashing.
* **Zero Session Integrity:** No session cookies, HTTP-only flags, or JWT signatures.
* **Authentication Bypass:** Any visitor can gain full administrative dashboard access simply by typing `localStorage.setItem('adminUser', JSON.stringify({nom: "Attacker"}))` in the browser console.
* **No Server-Side Enforcement:** Backend endpoints accept requests without verifying any authentication token or session.

---

## 18. Authorization & IDOR (Insecure Direct Object Reference)

* **Account Takeover / Modification:** `PUT /apiu/utilisateurs/update/{id}` accepts any `id` without verifying the caller's identity, allowing any user to overwrite another user's personal details and password.
* **Arbitrary User Deletion:** `DELETE /apiu/utilisateurs/delete/{id}` deletes any user record unconditionally.
* **Arbitrary Admin Deletion:** `DELETE /apiu/admin/delete/{id}` allows any unauthenticated user to delete system administrators.
* **Reservation Hijacking:** `POST /apir/reservations/create/{idu}` accepts the user ID `idu` directly in the URL path. Any user can create bookings billed to or associated with any other user ID.
* **Payment Snooping:** `GET /apir/paiements/{id}` and `GET /apir/admin/recent-payments` return payment records and credit card numbers without checking permissions.

---

## 19. Password Handling Audit

1. **Storage:** Both `Utilisateurs` (`password` column) and `Administrateurs` (`password` column) store passwords as raw, unencrypted VARCHAR strings.
2. **Seeds:** `DataInitializer.java` inserts default passwords `"password"`, `"adminpass"`, `"userpass"`, and `"pass123"` into the database in plaintext.
3. **API Leaks:** Every `GET` endpoint returning a user or administrator entity serializes the plaintext password into the JSON HTTP response.
4. **Form Re-population:** In `DACH/dashSettings.html`, the admin's plaintext password is automatically populated into an HTML `<input type="text">` form field upon page load.
5. **Console Leaks:** Front-end scripts print full user objects containing passwords into the browser console via `console.log`.

---

## 20. Payment Flow & PCI-DSS Audit

```text
[V1 PAYMENT WORKFLOW]
1. User completes reservation form in reservationTransport.html.
2. User submits credit card details:
   - Card Number: #card-number
   - Expiry Date: #expiry-date
   - CVV: #cvv
   - Payment Mode: #mode_paiement
3. jQuery packages values into JSON:
   var paymentData = {
       idr: reservationId,
       prixtot: montantTotal,
       modepaiement: $('#mode_paiement').val(),
       numcarte: $('#card-number').val(),
       date: $('#expiry-date').val(),
       cvv: $('#cvv').val()
   };
4. jQuery sends plain HTTP POST to:
   POST http://localhost:8888/apir/paiements/create
5. Backend PaiementsController persists the entity:
   paiementsServices.createPaiement(paiement);
6. MySQL PAIEMENTS table stores:
   id_paiement, idr, prixtot, modepaiement, " numcarte", date, cvv
7. Frontend redirects to static confimation.html.
```

### Critical Violations:
* **PCI-DSS Requirement 3.2:** Storage of sensitive authentication data (Card Verification Value / CVV) after authorization is strictly prohibited. Yuding V1 stores raw CVVs in MySQL.
* **PCI-DSS Requirement 3.4:** Primary Account Numbers (PAN / credit card numbers) must be rendered unreadable (encrypted/tokenized). Yuding V1 stores PANs in plaintext.
* **PCI-DSS Requirement 4.1:** Sensitive cardholder data transmitted across open networks must be encrypted with strong cryptography (HTTPS/TLS). Yuding V1 transmits card numbers over plain HTTP.
* **No Merchant Processor:** No financial transaction actually takes place; payments are purely simulated by saving card numbers to a database.

---

## 21. Price & Business Logic Audit

### 21.1 Client-Authoritative Pricing Flaw
In `frontend/reservation/reservationTransport.html` (lines 182-184):
```javascript
var prixUnitaire = 100;
var prixTotal = reservationData.duree * reservationData.nombrepersonne * prixUnitaire;
reservationData.prixtot = prixTotal.toFixed(2);
```
In `backend/reservation-service/.../models/Reservations.java` (lines 48-50):
```java
public Double calculateTotalPrice() {
    if (prixtot != null) return prixtot;
    ...
}
```
**Impact:** The backend explicitly checks if `prixtot` is already set by the client. If present, it bypasses server-side price calculation entirely and persists the client's submitted price. An attacker can intercept the HTTP request or modify JavaScript variables to purchase any travel booking for `0.01 €`.

### 21.2 Static Pricing Formula Inconsistency
The client applies a static `100 €` base rate regardless of whether the user reserved an international flight, a high-speed train, a luxury hotel, or a short taxi ride.

---

## 22. Booking / Reservation Lifecycle Audit

```text
[ACTUAL V1 BOOKING LIFECYCLE]
Search Item ──> Click Booking ──> reservationTransport.html 
  ──> POST /apir/reservations/create/{idu} (Reservation created in DB: ACTIVE)
  ──> POST /apir/paiements/create (Payment created in DB: UNLINKED)
  ──> Redirect to confimation.html (No status check)
```

### Structural Deficiencies:
1. **No State Machine:** Reservations lack status flags (`PENDING`, `CONFIRMED`, `CANCELLED`, `EXPIRED`, `REFUNDED`). Once inserted, a reservation is permanently static.
2. **Ghost Reservations:** If a user creates a reservation but abandons the checkout form before entering payment details, the reservation remains permanently saved in the database.
3. **No Transactional Atomicity:** Reservation creation and payment recording are handled in two separate, decoupled HTTP requests without a distributed transaction or saga coordinator.
4. **No Inventory Locking:** Accommodations and transport seats are never locked or decremented during reservation. Multiple users can book the same hotel room simultaneously.

---

## 23. AI Service Deep-Dive

* **Model & Provider:** OpenAI `gpt-4o-mini` accessed via Spring AI ChatClient.
* **RAG Architecture:** 
  - Source document: `backend/ai-service/src/main/resources/docs/Hébergements au Maroc.pdf` (968 KB).
  - Splitter: `TokenTextSplitter`.
  - Vector Store: PgVector running on PostgreSQL 16.
  - Ingestion: Executed automatically on application boot via `CommandLineRunner` in `IngestionService.java`.
* **Identified Defects:**
  1. **Duplicate Chunk Ingestion:** On every container restart, `IngestionService` re-reads and re-ingests the PDF into PgVector without checking for existing vectors, causing unbounded table bloat and duplicate retrieval results.
  2. **Stateless Endpoint:** The chat controller does not accept or track conversation history. The client-side `conversationHistory` array is updated in browser memory but never transmitted to the backend.
  3. **HTTP GET Path Parameter:** The prompt is passed via `@GetMapping("/{question}")`. Complex queries containing slashes, question marks, or ampersands trigger HTTP 400/404 errors.
  4. **Ephemeral Vector Database:** `pgvector` container in `docker-compose.yml` has no persistent volume. All vector embeddings are wiped if the container is recreated.

---

## 24. Network Exposure & Microservice Perimeter

* **Gateway Bypass:** In `docker-compose.yml`, host ports are mapped directly for every microservice (`8081:8081`, `8090:8090`, `8072:8072`, `7777:7777`, `8761:8761`, `9091:9091`). Attackers can bypass Spring Cloud Gateway entirely and communicate directly with raw microservice ports.
* **Direct Database Exposure:** MySQL port `3306` and PostgreSQL port `5432` are published to the host network interface (`0.0.0.0`), allowing external network scans to reach the databases.
* **CORS Wildcards & Null Origins:** Gateway permits `http://localhost:63342,null` with `allowCredentials=true`. The `null` origin permits sandbox iframe attacks and local file execution exploits.

---

## 25. Test Coverage & Quality

| Service | Test Class | Type | Assertions | Test Quality | Coverage |
|---|---|---|---|---|---|
| `ai-service` | `AiServiceApplicationTests` | Spring Boot Integration | `contextLoads()` (Empty) | Non-functional stub | 0% |
| `commentaire-service` | `AlertsServiceApplicationTests` | Spring Boot Integration | `contextLoads()` (Empty) | Non-functional stub | 0% |
| `config-service` | `ConfigServiceApplicationTests` | Spring Boot Integration | `contextLoads()` (Empty) | Non-functional stub | 0% |
| `discovery-service` | `DiscoveryServiceApplicationTests` | Spring Boot Integration | `contextLoads()` (Empty) | Non-functional stub | 0% |
| `gateway-service` | `GatewayServiceApplicationTests` | Spring Boot Integration | `contextLoads()` (Empty) | Non-functional stub | 0% |
| `reservation-service` | `ReservationServiceApplicationTests` | Spring Boot Integration | `contextLoads()` (Empty) | Non-functional stub | 0% |
| `user-service` | `UserServiceApplicationTests` | Spring Boot Integration | `contextLoads()` (Empty) | Non-functional stub | 0% |

**Overall Test Evaluation:** There are **zero unit tests**, **zero endpoint tests**, and **zero integration tests** across the entire Yuding repository.

---

## 26. Feature Matrix

| Feature | Current Status | Evidence / Implementation | Operational Problems | V2 Decision |
|---|---|---|---|---|
| **User Sign-Up** | WORKING | `user-service` (`/apiu/utilisateurs/create`) | Plaintext password storage; no email verification. | **REWRITE** |
| **User Login** | WORKING | `user-service` (`/apiu/utilisateurs/search`) | Returns password in response; insecure session flag. | **REWRITE** |
| **User Profile Management** | PARTIAL | Backend endpoint exists; no frontend UI. | Missing frontend view. | **REWRITE** |
| **Admin Authentication** | WORKING | `user-service` (`/apiu/admin/search`) | Plaintext storage; client-only localStorage gate. | **REWRITE** |
| **Admin Dashboard KPIs** | WORKING | `reservation-service` (`/apir/admin/stats`) | Unprotected endpoint; exposes all business revenue. | **REWRITE** |
| **Admin User Management** | WORKING | `dashUsers.html` + `userController` | Full CRUD without authorization checks; XSS. | **REWRITE** |
| **Admin Admin Management** | WORKING | `dashAdmins.html` + `adminController` | Allows unauthenticated creation/deletion of admins. | **REWRITE** |
| **Admin Catalog CRUD** | WORKING | `dashHebergements.html`, `dashTransport.html` | No authorization checks; XSS vulnerabilities. | **REWRITE** |
| **Admin Activities CRUD** | PARTIAL / BROKEN | `dashActivitee.html` | Delete pre-check calls non-existent 404 endpoint. | **REWRITE** |
| **Hotel / Riad Search** | WORKING | `index.html` + `HebergementsController` | Searches local MySQL static rows only. | **REWRITE** |
| **Flight Search** | WORKING | `Vols.html` + `TransportsController` | Searches local MySQL static rows only. | **REWRITE** |
| **Train Search** | WORKING | `Trains.html` + `TransportsController` | Searches local MySQL static rows only. | **REWRITE** |
| **Taxi Search** | WORKING | `Taxis.html` + `TransportsController` | Searches local MySQL static rows only. | **REWRITE** |
| **Car Rental Search** | WORKING | `location.html` + `TransportsController` | Searches local MySQL static rows only. | **REWRITE** |
| **Activity Search** | WORKING | `activitees.html` + `ActiviteesController` | Bypasses gateway to port 8090; static rows. | **REWRITE** |
| **Booking Creation** | WORKING | `reservationTransport.html` + `ReservationController` | Client controls price; no state machine. | **REWRITE** |
| **Payment Processing** | FAKE / DEMO ONLY | `PaiementsController` | Saves raw card numbers to DB; no financial charge. | **REPLACE** |
| **Booking Confirmation** | FAKE / DEMO ONLY | `confimation.html` | Static page; no booking data; no email sent. | **REWRITE** |
| **Customer Comments** | PARTIAL | `index.html` + `CommentaireController` | Disconnected from items; duplicate form action. | **REWRITE** |
| **AI Travel Assistant** | WORKING | `ai-service` + `index.html` | GET path prompt; no history; duplicate ingestion. | **REWRITE** |
| **Service Discovery** | WORKING | `discovery-service` (Eureka) | Functional locally; high memory consumption. | **REPLACE** |
| **Centralized Config** | BROKEN ON FRESH CLONE | `config-service` | Gitlink lacks remote/.gitmodules; fails on clone. | **REPLACE** |
| **API Gateway Routing** | WORKING | `gateway-service` | Routes functional; lacks authentication filter. | **REWRITE** |

---

## 27. Missing Features for V2

1. **Real Travel Integrations:** Live flight feeds (Amadeus), live hotel inventory (Booking.com/Expedia), real-time train schedules.
2. **Real Payment Processing:** Stripe PaymentIntents, webhook signature validation, Apple Pay / Google Pay support, PCI compliance.
3. **Robust Security:** Spring Security 6 with stateless JWT tokens, BCrypt password hashing, role-based access control (`ROLE_USER`, `ROLE_ADMIN`).
4. **Booking Lifecycle State Machine:** `PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `EXPIRED`, `REFUNDED` states with automatic timeout expiration.
5. **Transactional Integrity:** Idempotency keys for payment/booking requests; database foreign key constraints.
6. **Notification Services:** Transactional email receipts (Resend / SendGrid), PDF booking vouchers.
7. **Production DevOps:** Multi-stage Docker builds, non-root container users, database migration scripts (Flyway/Liquibase), CI/CD pipeline.
8. **Internationalization & Accessibility:** Multilingual support (French, English, Arabic), semantic HTML, WCAG compliance.

---

## 28. KEEP / REWRITE / DELETE Classification Matrix

| Component / Path | Current Purpose | Classification | Technical Rationale | V2 Replacement |
|---|---|---|---|---|
| `frontend/reservation/*.html` | Client static pages | **DELETE** | Legacy jQuery/HTML architecture; inline scripts, XSS sinks, client pricing logic. | Next.js App Router (React + TypeScript). |
| `frontend/reservation/DACH/*.html` | Admin dashboard pages | **DELETE** | Insecure client-side auth bypass; unescaped DOM rendering. | Next.js `/admin` route group with SSR auth. |
| `frontend/reservation/image/*` | Brand images and travel photos | **KEEP** | High quality destination images, hotel photos, logos. | Assets moved to `public/images/` in Next.js. |
| `Plateforme de reservation des voyages.pptx` | Project slide presentation | **KEEP** | Valuable architectural and business context reference. | Retained in repository as reference. |
| `backend/discovery-service/` | Eureka Discovery Server | **DELETE** | Operational complexity and high memory footprint. | Containerized DNS (Docker Compose / K8s). |
| `backend/config-service/` | Spring Cloud Config Server | **DELETE** | Broken Gitlink dependency; fails on fresh clones. | Standard `.env` files and Docker secrets. |
| `backend/config-repo/` | Submodule config properties | **DELETE** | Gitlink desynchronization issue; exposed secrets in git. | Environment variable configurations. |
| `backend/gateway-service/` | Spring Cloud Gateway | **REWRITE** | Needs centralized JWT filter, rate limiting, and CORS fix. | Enhanced Spring Cloud Gateway or Next.js API layer. |
| `backend/user-service/` | User & Admin microservice | **REWRITE** | Plaintext passwords, lack of security, duplicated models. | Unified Auth & User Module with BCrypt and JWT. |
| `backend/reservation-service/` | Bookings & travel catalog | **REWRITE** | Overloaded monolith; client pricing flaws; raw card storage. | Split into Booking Module and Catalog Module. |
| `backend/commentaire-service/` | Reviews service | **REWRITE** | Legacy alert entity; no foreign key relationships. | Reviews & Ratings Module linked to Bookings. |
| `backend/ai-service/` | RAG assistant service | **REWRITE** | Pre-release M5 version; GET path prompt; duplicate indexing. | Spring AI 1.0 GA or FastAPI/LangChain service. |
| `docker-compose.yml` | Container orchestration | **REWRITE** | Exposed DB ports, blank root passwords, missing volumes. | Production-grade Docker Compose with secrets. |
| `backend/**/Dockerfile` | Container definitions | **REWRITE** | Lacks multi-stage builds; requires local jar compilation. | Multi-stage Dockerfiles with eclipse-temurin 21. |
| MySQL Database (`users_db`, `reservations_db`) | Relational persistence | **REPLACE** | Multiple uncoordinated MySQL databases. | Single consolidated PostgreSQL instance. |
| PgVector Database (`mydatabase`) | Vector store | **KEEP WITH CHANGES** | Suitable for AI embeddings. | Add persistent Docker volume; consolidate into Postgres. |

---

## 29. Security Vulnerability Findings (By Severity)

### CRITICAL (5 Findings)
1. **CRITICAL-01: Plaintext Password Storage & Transmission**
   - *Affected:* `user-service` (`Utilisateurs.java`, `Administrateurs.java`), `login.html`, `loginN.html`.
   - *Detail:* Passwords stored in raw plaintext in MySQL; returned in JSON API responses; logged to console.
   - *V2 Fix:* BCrypt password hashing (`cost=12`); sanitize DTOs to never return passwords.
2. **CRITICAL-02: Storage of Plaintext Credit Card Numbers and CVVs (PCI-DSS Breach)**
   - *Affected:* `reservation-service` (`Paiements.java`, `PaiementsController.java`), `reservationTransport.html`.
   - *Detail:* Raw 16-digit PANs and CVVs transmitted over HTTP and stored in MySQL `PAIEMENTS` table.
   - *V2 Fix:* Immediate removal of card storage. Integrate Stripe Elements (tokenized card handling).
3. **CRITICAL-03: Client-Authoritative Pricing Calculation**
   - *Affected:* `reservationTransport.html` (line 184), `Reservations.java` (line 49).
   - *Detail:* Price computed client-side as `100 * duree * persons`; backend accepts and persists submitted price.
   - *V2 Fix:* Backend must recalculate total price from database pricing tables prior to booking creation.
4. **CRITICAL-04: Total Absence of Backend Authentication & Authorization**
   - *Affected:* All 58 REST API endpoints across all services.
   - *Detail:* Spring Security is absent. Any caller can execute administrative deletes, edits, or data dumps.
   - *V2 Fix:* Implement Spring Security 6 filter chain with stateless JWT validation.
5. **CRITICAL-05: Database Exposed with Blank Root Password & Public phpMyAdmin**
   - *Affected:* `docker-compose.yml` (`mysql`, `phpmyadmin`).
   - *Detail:* MySQL port 3306 exposed with `MYSQL_ALLOW_EMPTY_PASSWORD=yes`; phpMyAdmin exposed on 8080.
   - *V2 Fix:* Remove phpMyAdmin; enforce strong passwords via environment variables; restrict DB ports to internal network.

### HIGH (5 Findings)
6. **HIGH-01: Trivial Administrative Dashboard Auth Bypass**
   - *Affected:* `frontend/reservation/DACH/admin-layout.js`.
   - *Detail:* Admin gate only verifies presence of `localStorage.getItem('adminUser')`.
   - *V2 Fix:* Server-side session verification with HTTP-only cookies in Next.js middleware.
7. **HIGH-02: Insecure Direct Object Reference (IDOR) on Users & Bookings**
   - *Affected:* `/apiu/utilisateurs/update/{id}`, `/apir/reservations/create/{idu}`.
   - *Detail:* User ID passed in path/body without validating against authenticated session principal.
   - *V2 Fix:* Extract user ID strictly from the verified JWT `sub` claim on the server.
8. **HIGH-03: Historical OpenAI API Key Leak in Git Repository**
   - *Affected:* `backend/config-repo` (commit `69ba7e6b30eb412ae09dfa5631f7b91727f410e8`).
   - *Detail:* Live secret `sk-proj-pOmZ****` committed to git history.
   - *V2 Fix:* Revoke key in OpenAI dashboard; scrub commit history before open-sourcing.
9. **HIGH-04: Widespread Stored and Reflected DOM XSS Sinks**
   - *Affected:* 13 distinct locations in frontend client and admin dashboard HTML files.
   - *Detail:* Data inserted into `innerHTML` and `$.html()` without escaping.
   - *V2 Fix:* React / Next.js automatic JSX escaping.
10. **HIGH-05: Permissive CORS with Null Origin Acceptance**
    - *Affected:* `backend/gateway-service/.../application.properties`.
    - *Detail:* `allowedOrigins=http://localhost:63342,null` with `allowCredentials=true`.
    - *V2 Fix:* Restrict allowed origins strictly to production domain in V2.

### MEDIUM (4 Findings)
11. **MEDIUM-01: Microservices Directly Reachable on Host Ports Bypassing Gateway**
    - *Detail:* Ports 8081, 8090, 8072, 7777, 9091 published in Docker Compose.
12. **MEDIUM-02: Ephemeral Vector Database Without Persistent Storage**
    - *Detail:* `pgvector` container lacks named volume mount; embeddings lost on restart.
13. **MEDIUM-03: AI Prompt Injection via HTTP GET Path Variable**
    - *Detail:* Prompts sent via URL path without escaping, length bounds, or rate limiting.
14. **MEDIUM-04: Unpinned and Insecure External CDN Script Tags**
    - *Detail:* Emoji Mart loaded via `@latest`; jQuery and FontAwesome loaded without SRI hashes.

---

## 30. Technical Debt & Code Quality Findings

1. **Typo in Package & Directory Names:**
   - Folder named `feigh` instead of `feign` in `reservation-service`.
   - Directory named `DACH` instead of `DASH` in frontend.
   - Column `tele_fournisseu` (missing `r`) in `Transports.java`.
   - Column ` numcarte` (accidental leading space) in `Paiements.java`.
   - Column `photo_hebergament` (spelled with `a` instead of `e`) in `Hebergements.java`.
   - Page named `confimation.html` (missing `r`) in frontend.
2. **Inconsistent Endpoint Conventions:**
   - Activity delete uses `DELETE /apir/activities/{id}` whereas all other services use `/delete/{id}`.
   - Transport search routes named `/search`, `/search1`, `/search2`, `/search3`.
3. **Data Type Mismatches:**
   - Supplier phone is `Long` in `Hebergements` but `String` in `Transports`.
   - Durations are `String` in `Activitees` ("2 heures") but `Long` in `Reservations`.
   - Number of persons is `Double` in `Reservations` allowing fractional quantities.
   - Prices use `float` in `Hebergements` and `Transports`, but `Double` in `Activitees`. Currency must use `BigDecimal`.
4. **Duplicate Code:**
   - Entire dark mode toggle logic is duplicated verbatim across all 9 client HTML files.
   - Chatbot SVG icons and UI markup are copy-pasted across 6 separate HTML pages.
5. **Dead / Unused Endpoints:**
   - `GET /apir/reservations/apiu/utilisateurs/id/{id}` (redundant Feign proxy).
   - `POST /apiu/utilisateurs/{username}` (POST used for read lookup; unused by frontend).

---

## 31. Investigation of `backend/config-repo` Gitlink Anomaly

* **Issue Found:** In Git commit history, `backend/config-repo` is tracked as a gitlink (`mode 160000`) pointing to commit `69ba7e6b30eb412ae09dfa5631f7b91727f410e8`, but there is **no `.gitmodules` file** in the repository root.
* **Local Inspection Results:**
  - `backend/config-repo/.git` is an independent standalone Git repository initialized locally on the author's workstation.
  - Inspection of `backend/config-repo/.git/config` reveals that **no remote URL exists** (`[remote "origin"]` section is completely absent).
  - All source files (`ai-service.properties`, `application.properties`, `commentaire-service.properties`, `reservation-service.properties`, `user-service.properties`) are physically present on disk.
* **Reproducibility on Fresh Clone:**
  - When cloning `https://github.com/ELBATTAHAHMED/Yuding.git` on any new machine, Git cannot resolve or clone `backend/config-repo`.
  - The `backend/config-repo` directory remains completely empty.
  - As a result, `config-service` crashes on startup (`Cannot clone or locate file:///config-repo`), causing `user-service`, `reservation-service`, and `commentaire-service` to fail health checks.
* **V2 Architecture Recommendation:**
  - Eliminate Spring Cloud Config Server and the submodule structure entirely.
  - Replace with root `.env.example` and standard environment variables injected via Docker Compose or Kubernetes ConfigMaps.

---

## 32. README Documentation vs Reality

| Aspect | README Claim | Source Code Reality | Divergence Severity |
|---|---|---|---|
| **Service Count** | Lists 7 Spring Boot services | 7 services exist, but `config-repo` gitlink is broken on clone. | **HIGH** |
| **Databases** | Mentions "MySQL (principal)" | MySQL is used, but PostgreSQL + pgvector is also required for `ai-service`. | **MEDIUM** |
| **Real Travel Data** | Implies functional travel booking platform | Zero external travel APIs exist; all data is mocked in static database seeds. | **HIGH** |
| **Payment System** | Describes booking and payment flow | Payment is completely fake; raw credit card numbers stored in MySQL. | **CRITICAL** |
| **Startup Instructions** | Claims `docker-compose up -d` works out of the box | Fails on clean clone because JAR files are not built and `config-repo` is empty. | **CRITICAL** |
| **Admin Route Prefix** | Documents routes as using `/apir/` and `/apiu/` | Accurate, but omits that routes are completely unauthenticated. | **HIGH** |

---

## 33. Yuding V2 Architecture & Migration Recommendations

```text
[YUDING V2 TARGET ARCHITECTURE]

       ┌───────────────────────────────────────────────────────────┐
       │                   Next.js 15 (React 19)                   │
       │     - App Router, Tailwind CSS, TypeScript                │
       │     - Client Portal & Unified Admin Dashboard             │
       │     - Server Components & Server Actions                  │
       └─────────────────────────────┬─────────────────────────────┘
                                     │ HTTPS / JSON Web Token (JWT)
                                     ▼
       ┌───────────────────────────────────────────────────────────┐
       │                 API Gateway / Core Backend                │
       │     - Spring Boot 3.4+ / Java 21                          │
       │     - Spring Security 6 (Stateless JWT, BCrypt)           │
       │     - Distributed Rate Limiting & Validation              │
       └───────┬─────────────────────┬─────────────────────┬───────┘
               │                     │                     │
               ▼                     ▼                     ▼
     ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
     │  Booking & Cart  │  │  Travel Catalog  │  │  AI RAG Engine   │
     │  State Machine   │  │  (Amadeus / Live)│  │  (Spring AI GA)  │
     └─────────┬────────┘  └─────────┬────────┘  └─────────┬────────┘
               │                     │                     │
               └──────────────┬──────┴─────────────────────┘
                              ▼
               ┌───────────────────────────────┐
               │    PostgreSQL 16 + PgVector   │
               │   (Single DB, Multi-Schema,   │
               │    Persistent Docker Volume)  │
               └───────────────────────────────┘
                              │
               ┌──────────────┴────────────────┐
               ▼                               ▼
     ┌──────────────────┐            ┌──────────────────┐
     │  Stripe Gateway  │            │  Amadeus Travel  │
     │  (Tokenized PSP) │            │  (Live Flight/   │
     └──────────────────┘            │   Hotel APIs)    │
                                     └──────────────────┘
```

### Strategic Recommendations:
1. **Frontend Modernization:** Replace all static HTML/jQuery files with a modern Next.js 15 application utilizing TypeScript, Tailwind CSS, and `shadcn/ui`.
2. **Authentication Architecture:** Implement industry-standard OAuth2 / OIDC or stateless JWT tokens using Spring Security 6. Never store or return plaintext passwords.
3. **PCI Compliance:** Strip all credit card fields from the database and frontend forms. Implement Stripe Elements with webhook signature validation.
4. **Data Consolidation:** Migrate all MySQL databases (`users_db`, `reservations_db`, `alerts_db`) and PgVector into a single PostgreSQL 16 cluster with schema isolation and persistent Docker volumes.
5. **Container DevOps:** Write multi-stage Dockerfiles that build from source code; run containers as unprivileged users; eliminate direct host port exposure for internal data stores.

---

## 34. Final Phase 2 Checklist

- [x] Full repository structure safely mapped and inspected.
- [x] All 7 backend microservices inventoried with ports, frameworks, and dependencies.
- [x] All 58 backend API endpoints discovered, categorized, and audited.
- [x] All 4 database instances (`users_db`, `reservations_db`, `alerts_db`, `mydatabase`) mapped.
- [x] All 8 database entities and JPA models inspected down to column names and types.
- [x] Database relationship map produced identifying missing foreign keys and loose linkages.
- [x] All 9 client frontend pages audited for state, endpoints, and functionality.
- [x] All 8 admin dashboard pages audited for security and CRUD operations.
- [x] All XSS DOM sinks, unescaped `innerHTML` calls, and storage vulnerabilities documented.
- [x] All Maven `pom.xml` dependencies and frontend CDN links cataloged.
- [x] Docker infrastructure, network exposure, and port conflicts analyzed.
- [x] `backend/config-repo` gitlink / submodule anomaly thoroughly investigated and explained.
- [x] Password handling, authentication flow, IDOR risks, and PCI-DSS payment violations detailed.
- [x] Client-authoritative pricing logic flaw identified and documented with source evidence.
- [x] Test coverage assessed across all services.
- [x] Feature matrix and missing capabilities inventory completed.
- [x] Comprehensive KEEP / REWRITE / DELETE classification matrix established.
- [x] Zero application code modified or deleted.
- [x] All credentials and leaked API keys safely masked.
