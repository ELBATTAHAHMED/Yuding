# Yuding V2 — Professional Search UX Frontend (Phase 31)

This document outlines the architecture, UX patterns, and implementation of the travel search experience across all 5 verticals in Yuding V2.

---

## 1. Overview

Phase 31 elevates Yuding from raw forms + basic list renderings into a modern, professional travel search experience.
All 5 travel search pages (`/flights`, `/hotels`, `/activities`, `/transfers`, `/trains`) share consistent interactive paradigms:
- **Autocomplete / Specialized Selectors**: Fast, validated location selection (Airports, Global Geo Places, Train Stations, Airport/City Transfer Pickups).
- **Date Constraints**: Minimum selection dates restricted to current/future dates (`min={today}`).
- **Passenger / Guest Controls**: Interactive steppers and popovers with granular breakdown (Adults, Children, Infants, Occupancy).
- **Loading Skeletons**: Product-specific pulse skeletons replacing raw loading spinners, matching the layout of actual result cards.
- **Sorting**: Immediate client-side sorting by Price (Asc/Desc), Duration, Departure Time, or Star Rating.
- **Active Filter Chips**: Visual feedback for active search facets and cabin/category filters with one-click removal.
- **Empty & Error States**: Standardized `<EmptyState>` and `<ErrorState>` components with actionable retry callbacks.

---

## 2. Core Search Components

### 2.1 UI Layer (`src/components/ui/`)

| Component | Responsibility |
|---|---|
| `PassengerSelector` | Accessible stepper with +/- buttons, min/max bounds, supporting multiple passenger tiers (adults, children, infants). |
| `SortBar` | Results toolbar displaying localized count (`"12 vols trouvés"`), sorting dropdown, and active filter chips with removal buttons. |
| `EmptyState` | Standardized empty view with icon, title, descriptive hint, and optional action. |
| `ErrorState` | User-friendly error message with retry trigger. |
| `LoadingSkeleton` | Base pulse skeleton primitives. |

### 2.2 Domain Skeleton Layer (`src/components/travel/`)

| Component | Layout Pattern |
|---|---|
| `FlightSkeleton` | Row layout mirroring flight cards: carrier badge, timeline, arrow duration, price badge. |
| `HotelSkeleton` | Card layout mirroring hotel cards: image block, rating, location, per-night price. |
| `ActivitySkeleton` | Grid card layout with image cover, tag, duration, and booking CTA. |
| `TrainSkeleton` | Row layout with operator badge, origin/destination times, and duration chip. |
| `TransferSkeleton` | Row layout with vehicle type icon, passenger capacity badge, and price block. |

---

## 3. Client-Side UX Utilities (`src/lib/search-ux.ts`)

Deterministic, pure client-side sorting and filtering utilities:
- `sortFlights(flights, sortKey)`:
  - `PRICE_ASC` (default)
  - `PRICE_DESC`
  - `DURATION_ASC`
  - `DEPARTURE_ASC`
- `sortHotels(hotels, sortKey)`:
  - `PRICE_ASC`
  - `PRICE_DESC`
  - `STARS_DESC`
- `sortActivities(activities, sortKey)`:
  - `PRICE_ASC`
  - `PRICE_DESC`
- `sortTransfers(transfers, sortKey)`:
  - `PRICE_ASC`
  - `PRICE_DESC`
- `buildActiveFilterChips(descriptors)`: Computes chip list for currently applied filters.
- `formatResultCount(count, singularNoun)`: French pluralization formatting (`"1 vol trouvé"`, `"3 vols trouvés"`).

---

## 4. Vertical Implementation Summary

| Vertical | Autocomplete / Selector | Passenger / Guest Control | Skeletons | Sorting Options | Filter Chips |
|---|---|---|---|---|---|
| **Flights** (`/flights`) | `AirportSelector` (IATA/City) | `PassengerSelector` Popover (Adults, Children, Infants, Cabin Class) | `FlightSkeleton` | Prix (croissant/décroissant), Durée, Départ | Classe de voyage |
| **Hotels** (`/hotels`) | `GeoPlaceSelector` | Room Occupancy Modal (Rooms, Adults, Children ages) | `HotelSkeleton` | Prix (croissant/décroissant), Étoiles | Type d'hébergement |
| **Activities** (`/activities`) | `GeoPlaceSelector` | Passenger Stepper (1–20 voyageurs) | `ActivitySkeleton` | Prix (croissant/décroissant) | Catégories |
| **Transfers** (`/transfers`) | `TransferLocationSelector` | Passenger Stepper (1–9 passagers) | `TransferSkeleton` | Prix (croissant/décroissant) | Mode (Privé, Navette, Minibus) |
| **Trains** (`/trains`) | `StationSelector` (ONCF + Transitous) | Passenger Stepper (1–9 passagers) | `TrainSkeleton` | Départ le plus tôt, Durée la plus courte | Directs uniquement, Type de train |

---

## 5. Architectural Compliance

- **No Fake Data / Synthetic Fallbacks**: When providers are unavailable or yield 0 results, clean `<EmptyState>` or `<ErrorState>` components are presented. No simulated inventory or mock prices.
- **Provider Quota & Performance Protection**: Client-side sorting operates instantaneously on already-fetched normalized offers without triggering redundant upstream provider queries.
- **Gateway Isolation**: All network calls strictly route through Gateway (`/travel/...`). No direct microservice port calls.
