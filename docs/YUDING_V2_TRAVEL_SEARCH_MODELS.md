# Yuding V2 — Travel Search Models & Travel Service Foundation

This document defines the travel search domain models, validation rules, Gateway routing, and provider-neutral response contracts established in **Phase 20**.

---

## 1. Architectural Overview

In accordance with `docs/YUDING_V2_ARCHITECTURE.md`, travel search functionality belongs strictly to `travel-service`. All external requests route through `gateway-service` (port `8888`) to the travel service registered as `TRAVEL-SERVICE` in Eureka.

```
Frontend (Next.js)
       │
       ▼
API Gateway (:8888)  ─── Route: /travel/** ───►  TRAVEL-SERVICE (:8082)
                                                        │
                                                        ├── Validation Layer (Bean Validation + Cross-field)
                                                        ├── Domain Query Layer (TravelSearchMapper)
                                                        └── Provider Neutral Search Contract (SearchResponse<T>)
```

### Key Service Characteristics
- **Service Name**: `travel-service`
- **Application Port**: `8082`
- **Logical PostgreSQL Schema**: `travel` (`currentSchema=travel` in schema-isolated `yuding` database)
- **Security**: Spring Security OAuth2 Resource Server validating RS256 JWT public keys (`certs/public.pem`). Search endpoints (`/travel/*/search`) are publicly accessible without authentication.
- **Audit & Tracing**: Correlation ID and Request ID preserved across requests via `SecurityAuditFilter`.
- **Zero Fake Data Policy**: In Phase 20, search endpoints return a clean `SearchResponse` with status `PROVIDER_UNAVAILABLE` and an empty results array (`[]`). No fake prices, fabricated airlines, or dummy hotel rooms are returned.

---

## 2. Gateway Route Configuration

Added to `gateway-service`:
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: travel-route
          uri: lb://TRAVEL-SERVICE
          predicates:
            - Path=/travel/**
```
- In `gateway-service` `SecurityConfig.java`, `/travel/**` is explicitly permitted for public access.
- Spoofed identity headers (`X-User-*`) are stripped by the Gateway before forwarding.

---

## 3. Request Models & Validation Contracts

All request models reside in `com.ahmed.travelservice.dto.request` and enforce strict validation rules.

### 3.1 Flight Search (`FlightSearchRequest`)
- **Endpoint**: `POST /travel/flights/search`
- **Fields**:
  - `origin` (`String`, 2–150 chars, `@NotBlank`): departure airport or city.
  - `destination` (`String`, 2–150 chars, `@NotBlank`): destination airport or city.
  - `departureDate` (`LocalDate`, `@NotNull`, `@FutureOrPresent`): date of departure.
  - `returnDate` (`LocalDate`, optional): return date for round trips. Must be `>= departureDate`.
  - `adults` (`Integer`, 1–9, default `1`): adult passengers (>= 12 years).
  - `children` (`Integer`, 0–8, default `0`): child passengers (2–11 years).
  - `infants` (`Integer`, 0–4, default `0`): infant passengers (< 2 years). Cannot exceed `adults`.
  - `travelClass` (`TravelClass` enum: `ECONOMY`, `PREMIUM_ECONOMY`, `BUSINESS`, `FIRST`, default `ECONOMY`).
  - `nonStop` (`Boolean`, default `false`).
  - `currency` (`String`, 3-letter ISO code, default `EUR`).
- **Cross-Field Validations**:
  - `origin` and `destination` cannot be identical.
  - `returnDate` cannot precede `departureDate`.
  - `infants` cannot exceed `adults`.

### 3.2 Hotel Search (`HotelSearchRequest`)
- **Endpoint**: `POST /travel/hotels/search`
- **Fields**:
  - `destination` (`String`, 2–150 chars, `@NotBlank`): city, region, or property name.
  - `checkIn` (`LocalDate`, `@NotNull`, `@FutureOrPresent`): check-in date.
  - `checkOut` (`LocalDate`, `@NotNull`): check-out date. Must be strictly after `checkIn`.
  - `rooms` (`Integer`, 1–8, default `1`).
  - `adults` (`Integer`, 1–30, default `1`).
  - `children` (`Integer`, 0–20, default `0`).
  - `propertyType` (`String`, default `ALL`).
  - `currency` (`String`, 3-letter ISO code, default `EUR`).
- **Cross-Field Validations**:
  - `checkOut` must be strictly after `checkIn`.

### 3.3 Activity Search (`ActivitySearchRequest`)
- **Endpoint**: `POST /travel/activities/search`
- **Fields**:
  - `destination` (`String`, 2–150 chars, `@NotBlank`).
  - `date` (`LocalDate`, optional).
  - `travelers` (`Integer`, 1–50, default `1`).
  - `category` (`String`, default `ALL`).
  - `radiusKm` (`Integer`, 1–100, default `25`).
  - `currency` (`String`, 3-letter ISO code, default `EUR`).

### 3.4 Transfer Search (`TransferSearchRequest`)
- **Endpoint**: `POST /travel/transfers/search`
- **Fields**:
  - `pickup` (`String`, 2–150 chars, `@NotBlank`).
  - `dropoff` (`String`, 2–150 chars, `@NotBlank`).
  - `date` (`LocalDate`, `@NotNull`, `@FutureOrPresent`).
  - `time` (`LocalTime`, `@NotNull`).
  - `passengers` (`Integer`, 1–20, default `1`).
  - `transferType` (`TransferType` enum: `TAXI`, `TRAIN`, `CAR_RENTAL`, `PRIVATE`, `SHUTTLE`, default `TAXI`).
  - `currency` (`String`, 3-letter ISO code, default `EUR`).
- **Cross-Field Validations**:
  - `pickup` and `dropoff` cannot be identical.

---

## 4. Domain Queries & Normalization

Validated request DTOs are mapped into immutable domain query models using `TravelSearchMapper`:
- Trims all location strings.
- Upper-cases and validates currency codes.
- Normalizes enums and applies sensible defaults.
- Separates transport/HTTP DTOs from internal domain representation.

Domain query models:
- `FlightSearchQuery`
- `HotelSearchQuery`
- `ActivitySearchQuery`
- `TransferSearchQuery`

---

## 5. Provider-Neutral Response Contract

All search endpoints return a standardized `SearchResponse<T>` wrapper:
```json
{
  "searchId": "33f5aa3d-2927-4af2-aa94-cfe3015b8b41",
  "status": "PROVIDER_UNAVAILABLE",
  "message": "Flight search request validated successfully. External flight providers are scheduled for Phase 21+.",
  "totalResults": 0,
  "results": []
}
```

### Monetary Field Constraints
In compliance with Yuding Rule 3:
- All monetary fields in offer DTOs (`price`, `basePrice`, `taxes`, `fees`) use `BigDecimal`.
- Float and double are strictly forbidden for currency amounts.

Offer DTOs:
- `FlightOfferDto`: contains airline, flight numbers, segments, cabin class, seats, and `BigDecimal` price breakdown.
- `HotelOfferDto`: contains hotel name, star rating, room types, amenities, and `BigDecimal` price per night.
- `ActivityOfferDto`: contains title, category, duration, meeting point, and `BigDecimal` price per participant.
- `TransferOfferDto`: contains transfer type, vehicle category, passenger capacity, and `BigDecimal` fixed price.

---

## 6. Frontend Integration

1. **Central API Client**: All requests route through `apiClient.post(...)` via Gateway prefix `/travel/*`.
2. **Travel Service (`src/services/travel.service.ts`)**:
   - `searchFlights(request)` -> `/travel/flights/search`
   - `searchHotels(request)` -> `/travel/hotels/search`
   - `searchActivities(request)` -> `/travel/activities/search`
   - `searchTransfers(request)` -> `/travel/transfers/search`
3. **UI Feedback**: Public pages (`/flights`, `/hotels`, `/activities`, `/transfers`, and `/`) display clean provider status banners informing the user when provider integrations are pending (Phase 21+).

---

## 7. Verification Summary

- **Backend Unit & Integration Tests**: 32 tests in `travel-service` passing (`BUILD SUCCESS`):
  - `TravelSearchControllerTest` (5 tests)
  - `TravelSearchMapperTest` (5 tests)
  - `FlightSearchModelTest` (8 tests)
  - `HotelSearchModelTest` (6 tests)
  - `ActivitySearchModelTest` (4 tests)
  - `TransferSearchModelTest` (4 tests)
- **Gateway Service**: 8 tests passing (`BUILD SUCCESS`), route to `TRAVEL-SERVICE` verified.
- **Config Service**: Compiles cleanly with travel service profile configurations (`dev`, `test`, `staging`, `prod`).
- **Frontend Automated Tests**: 42 tests passing in `frontend/web` (`npm test`).
- **Type Checking**: `npx tsc --noEmit` completes with 0 errors.
- **Production Build**: `npm run build` completes successfully with all 20 static/dynamic routes prerendered.
