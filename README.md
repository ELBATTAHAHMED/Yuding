![image_alt](https://github.com/ELBATTAHAHMED/Yuding/blob/df6279fada049f76968f83e8f69f280616033040/Yuding.png)

# Yuding - Plateforme de Reservation des Voyages

## Overview
Plateforme de reservation de voyages avec frontend statique (HTML/CSS/JS) et backend en microservices Spring Boot (Gateway + Eureka + Config Server). Le dashboard admin est dans `frontend/reservation/DACH`.

## Tech Stack
- Frontend: HTML/CSS/JS (jQuery + Font Awesome)
- Backend: Spring Boot (REST), Spring Cloud Gateway, Eureka Discovery, Config Server
- Data: MySQL (principal) + JPA/Hibernate (config base de donnees via config-server)

## Structure
- `frontend/reservation/` UI client
- `frontend/reservation/DACH/` Dashboard admin
- `backend/` microservices Spring Boot
- `backend/config-repo/` configuration centralisee

## Services & Ports
- Gateway: `backend/gateway-service` (port 8888)
- Discovery (Eureka): `backend/discovery-service` (port 8761)
- Config Server: `backend/config-service` (port 9091)
- Reservation Service: `backend/reservation-service` (port 8090)
- User Service: `backend/user-service` (port 8081)
- Commentaire Service: `backend/commentaire-service` (port 8072)
- AI Service: `backend/ai-service` (port 7777)

## Database
- MySQL (port 3306) utilise par les services applicatifs
- Admin DB GUI via phpMyAdmin (port 8080)

## Admin Dashboard
### Pages
- `frontend/reservation/DACH/dashOverview.html` (Overview)
- `frontend/reservation/DACH/dashTransport.html` (Transports)
- `frontend/reservation/DACH/dashActivitee.html` (Activites)
- `frontend/reservation/DACH/dashHebergements.html` (Hebergements)
- `frontend/reservation/DACH/dashUsers.html` (Users)
- `frontend/reservation/DACH/dashAdmins.html` (Administrators)
- `frontend/reservation/DACH/dashSettings.html` (Settings)
- Login: `frontend/reservation/DACH/loginN.html`

### Endpoints utilises (via Gateway)
- Admin stats: `GET /apir/admin/stats`
- Dernieres reservations: `GET /apir/admin/recent-reservations?limit=10`
- Derniers paiements: `GET /apir/admin/recent-payments?limit=10`
- Utilisateurs: `GET /apiu/utilisateurs/all`
- Administrateurs: `GET /apiu/admin/all`, `POST /apiu/admin/create`, `PUT /apiu/admin/update/{id}`, `DELETE /apiu/admin/delete/{id}`

### Routing Gateway
- ` /apir/** ` -> Reservation Service
- ` /apiu/** ` -> User Service
- ` /apic/** ` -> Commentaire Service
- ` /ai/** ` -> AI Service

## Demarrage local

### Option 1: Docker (recommande)
Le fichier `docker-compose.yml` est a la racine du repo.
```
docker-compose up -d
```

### Option 2: Build manuel (chaque service)
Dans chaque dossier de service, lancer la commande suivante:
```
./mvnw.cmd -DskipTests clean package
```

Services Spring Boot disponibles:
- `backend/discovery-service`
- `backend/config-service`
- `backend/user-service`
- `backend/reservation-service`
- `backend/commentaire-service`
- `backend/ai-service`
- `backend/gateway-service`

Ensuite demarrer les jars generes ou utiliser votre IDE pour run les services.


## Authors

- **EL BATTAH Ahmed**
