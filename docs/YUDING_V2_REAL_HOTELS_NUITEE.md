# Yuding V2 — Real Provider-Backed Hotels: Nuitee Connect (LiteAPI v3)

This document describes the design, implementation, and operational architecture of the Nuitee Connect / LiteAPI v3 integration for provider-backed hotel search in Yuding V2 (`travel-service`, port 8082).

---

## 1. Architectural Role & Provider Isolation

Following the provider abstraction established in Phase 21:
- `travel-service` (port 8082) owns the travel domain.
- Flights are backed by **Scrappa** (`TRAVEL_FLIGHTS_PROVIDER=scrappa`).
- Hotels are backed by **Nuitee Connect / LiteAPI v3** (`TRAVEL_HOTELS_PROVIDER=nuitee`).
- Activities and Transfers remain unconfigured (`none`) pending future dedicated phases.
- Offer Revalidation is not supported by Nuitee Rates API and safely returns `PROVIDER_CAPABILITY_UNSUPPORTED`.
- Zero database mutations occur during hotel searches.

```
Next.js Frontend (port 3000)
    │  POST /travel/hotels/search
    ▼
API Gateway (port 8888)
    │  Path routing (/travel/**)
    ▼
travel-service (port 8082)
    │  TravelProviderRegistry -> NUITEE
    ▼
NuiteeClient (Spring RestClient)
    │  POST https://api.liteapi.travel/v3.0/hotels/rates
    │  Header: X-API-Key: <sand_...>
    ▼
Nuitee Connect / LiteAPI v3 Sandbox
```

---

## 2. API Contract & Zero-Cost Strategy

### Strict Cost Rule Compliance
- The LiteAPI `/data/places` Google Places autocomplete API incurs a \$0.01 fee per request.
- To strictly eliminate external API costs for search, Yuding V2 bypasses `/data/places` and leverages the native `cityName` and `countryCode` parameters directly on the free `POST /hotels/rates` endpoint.
- For Moroccan and international travel (e.g. Marrakech MA, Casablanca MA, Agadir MA, Paris FR), city names and ISO country codes are resolved cleanly via structured inputs and domain mapping.

### Endpoint Contract
- **Method:** `POST`
- **URL:** `https://api.liteapi.travel/v3.0/hotels/rates`
- **Authentication Header:** `X-API-Key: <NUITEE_API_KEY>`
- **Request Body:**
```json
{
  "cityName": "Marrakech",
  "countryCode": "MA",
  "checkin": "2026-09-27",
  "checkout": "2026-09-30",
  "currency": "EUR",
  "guestNationality": "MA",
  "occupancies": [
    {
      "adults": 2,
      "children": [7]
    }
  ]
}
```

---

## 3. Data Models & Normalization

### 1. Request Mapping (`HotelSearchQuery` → `NuiteeRatesRequest`)
- `checkIn` / `checkOut` validated (`checkIn >= today`, `checkOut > checkIn`).
- `occupancies` mapped from `RoomOccupancyDto`:
  - `adults`: 1 to 4 per room.
  - `children`: List of integer ages (0 to 17) for each child in that room.
- `guestNationality`: 2-letter ISO country code (default `MA`).
- `currency`: 3-letter currency code (default `EUR`).

### 2. Response Mapping (`NuiteeRatesResponse` → `HotelOfferDto`)
- **Hotel Metadata:** Extracted from the `hotels` array (`name`, `stars`, `rating`, `main_photo`, `address`).
- **Room Offers:** Extracted from the `data[].roomTypes[]` and `rates[]` hierarchy:
  - `offerId`: Provider-generated rate identifier (real `offerId` from Nuitee).
  - `roomName`: Human-readable room description (e.g. "Superior Double Room").
  - `boardType` / `boardName`: Board plan (e.g. "Breakfast included", "Room only").
  - `refundable`: Boolean derived from cancellation policies.
  - `price` / `pricePerNight`: Normalized using exact `BigDecimal` arithmetic.

---

## 4. Security & Secret Handling

1. **Secret Storage:**
   - Stored strictly in `backend/travel-service/.env.local` (Git-ignored).
   - Tracked `.env.example` contains only empty placeholders.
2. **Log Redaction:**
   - The API key is **never** printed to console or logs.
   - Raw response payloads are stripped from production logs.
3. **Key Format:**
   - Nuitee Connect sandbox keys start with `sand_` (e.g., `sand_xxxxxxxxxxxxxxxxxxxxxxxx`).
   - Account UUIDs or portal login IDs must not be used as the API key.

---

## 5. Frontend User Experience (`/hotels`)

1. **Initial State:**
   - Fields begin empty with intuitive placeholders.
   - No automated search fires on page mount.
2. **Destination Selector:**
   - Provides quick one-click shortcuts for popular destinations (Marrakech, Casablanca, Agadir, Paris, etc.) while allowing free text input.
3. **Occupancy Controls:**
   - Configurable rooms (1 to 4).
   - Adults (1 to 4 per room).
   - Children (0 to 3 per room) with individual age selectors.
   - Nationality selector (default MA).
4. **Validation:**
   - Search button is disabled until destination is provided and check-out is strictly after check-in.
5. **Results Presentation:**
   - Verified Nuitee Connect provider badge.
   - Expandable room offer drawer showing room details, meal plan, cancellation conditions, and total price.
   - "Sélectionner" button links directly to `/booking` with the real `offerId`.
