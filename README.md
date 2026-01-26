# Plateforme de Reservation des Voyages

## Admin Dashboard Navigation + Endpoints

### Pages Admin
- `frontend/reservation/DACH/dashOverview.html` (Overview)
- `frontend/reservation/DACH/dashTransport.html` (Transports)
- `frontend/reservation/DACH/dashActivitee.html` (Activites)
- `frontend/reservation/DACH/dashHebergements.html` (Hebergements)
- `frontend/reservation/DACH/dashUsers.html` (Users)
- `frontend/reservation/DACH/dashAdmins.html` (Administrators)
- `frontend/reservation/DACH/dashSettings.html` (Settings)

### Endpoints utilises
- Stats admin: `GET /apir/admin/stats`
- Dernieres reservations: `GET /apir/admin/recent-reservations?limit=10`
- Derniers paiements: `GET /apir/admin/recent-payments?limit=10`
- Utilisateurs: `GET /apiu/utilisateurs/all`, `PUT /apiu/utilisateurs/status/{id}`
- Administrateurs: `GET /apiu/admin/all`, `POST /apiu/admin/create`, `PUT /apiu/admin/update/{id}`, `DELETE /apiu/admin/delete/{id}`
