# Yuding V2 — Travel Provider Abstraction Architecture

## 1. Architectural Overview

Phase 21 establishes a **provider-neutral abstraction layer** inside `travel-service` (port 8082). In accordance with the Yuding V2 Architecture:
- Microservice controllers and domain search services (`TravelSearchService`) **never depend on any specific external travel provider** (such as Amadeus, Duffel, Booking.com, or Viator).
- All travel vertical interactions (Flights, Hotels, Activities, Transfers) flow through a unified interface: `TravelProvider`.
- Active providers for each travel product are selected dynamically via externalized Spring configuration (`travel.providers.*`).
- When no live provider is enabled, the service falls back to `NoConfiguredTravelProvider`, strictly upholding Yuding's **zero-fake-data policy** (no fabricated flights, prices, or availability).
- Real provider integrations (starting with Flights in Phase 22) plug into this registry seamlessly without modifying search models, domain services, or REST controllers.

---

## 2. Core Abstractions & Capability Matrix

### 2.1 Capability Model (`ProviderCapability`)
Providers declare their capabilities explicitly:
```java
public enum ProviderCapability {
    FLIGHTS,
    HOTELS,
    ACTIVITIES,
    TRANSFERS,
    REVALIDATION
}
```

### 2.2 Product to Capability Mapping (`TravelProduct`)
Each travel vertical specifies its mandatory capability:
| Travel Product | Required Capability |
| :--- | :--- |
| `FLIGHTS` | `ProviderCapability.FLIGHTS` |
| `HOTELS` | `ProviderCapability.HOTELS` |
| `ACTIVITIES` | `ProviderCapability.ACTIVITIES` |
| `TRANSFERS` | `ProviderCapability.TRANSFERS` |

### 2.3 Provider Metadata (`ProviderMetadata`)
Identifies the provider and its feature support:
```java
public record ProviderMetadata(
    String providerCode,           // e.g., "AMADEUS", "DUFFEL", "NONE"
    String displayName,            // Human-readable name
    Set<ProviderCapability> supportedCapabilities
)
```

### 2.4 Unified Interface (`TravelProvider`)
```java
public interface TravelProvider {
    ProviderMetadata getMetadata();

    List<FlightOfferDto> searchFlights(FlightSearchQuery query) throws TravelProviderException;
    List<HotelOfferDto> searchHotels(HotelSearchQuery query) throws TravelProviderException;
    List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) throws TravelProviderException;
    List<TransferOfferDto> searchTransfers(TransferSearchQuery query) throws TravelProviderException;
    OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) throws TravelProviderException;
}
```
Default methods in `TravelProvider` throw `TravelProviderException.capabilityNotSupported(...)` for any operation the implementing provider does not support.

---

## 3. Provider Configuration

Provider bindings are configured per product in `application.properties` or `config/travel-service.yml`:

```yaml
travel:
  providers:
    default-provider: "none"
    flights: "none"       # In Phase 22: configured to "AMADEUS" or "DUFFEL"
    hotels: "none"        # In Phase 23: configured to hotel provider
    activities: "none"    # In Phase 24: configured to activity provider
    transfers: "none"     # In Phase 25: configured to transfer provider
```

### Configuration Binding (`TravelProviderProperties`)
- `@ConfigurationProperties(prefix = "travel.providers")`
- Maps configuration keys cleanly to typed fields.
- Defaults to `"none"`, ensuring zero unauthorized external API calls out-of-the-box.

---

## 4. Provider Registry & Dynamic Resolution

`TravelProviderRegistry` manages provider lifecycle and resolution:

```
                      +-----------------------------+
                      |     TravelSearchService     |
                      +--------------+--------------+
                                     |
                             resolves provider
                                     |
                                     v
                      +-----------------------------+
                      |   TravelProviderRegistry    |
                      +--------------+--------------+
                                     |
              +----------------------+----------------------+
              |                                             |
              v                                             v
     [Configured Provider]                       [Fallback Provider]
  e.g., Amadeus / StubAlpha                    NoConfiguredTravelProvider
(Capable of FLIGHTS/REVALIDATION)               (PROVIDER_NOT_CONFIGURED)
```

1. **Auto-Discovery:** Automatically discovers all Spring beans implementing `TravelProvider`.
2. **Dynamic Swapping:** Resolves the active provider for any product by inspecting `TravelProviderProperties`.
3. **Capability Validation:** Verifies the chosen provider supports the requested capability before delegating calls.
4. **Graceful Fallback:** If the configured provider name is `"none"`, blank, or unregistered, falls back to `NoConfiguredTravelProvider`.

---

## 5. Offer Revalidation Contract

Travel offers (prices, seat/room availability) are volatile. The revalidation contract ensures freshness before booking:

### 5.1 Revalidation Request (`POST /travel/offers/revalidate`)
```json
{
  "offerId": "FL-AMAD-2026-98765",
  "provider": "AMADEUS",
  "productType": "FLIGHTS",
  "originalPrice": 189.50,
  "currency": "EUR"
}
```

### 5.2 Revalidation Response (`OfferRevalidationResult`)
All monetary values strictly use `BigDecimal` for zero rounding error:
```json
{
  "offerId": "FL-AMAD-2026-98765",
  "provider": "AMADEUS",
  "valid": true,
  "priceChanged": false,
  "currentPrice": 189.50,
  "originalPrice": 189.50,
  "currency": "EUR",
  "message": "Offer confirmed valid at current price"
}
```

If the price changed, `priceChanged: true` is returned with the new `currentPrice`. If the offer is expired or sold out, `valid: false` is returned.

---

## 6. Error Handling & HTTP Status Mapping

`TravelProviderException` captures structured provider failures and maps to HTTP status codes in `GlobalExceptionHandler`:

| Error Code | HTTP Status | Description |
| :--- | :--- | :--- |
| `OFFER_NOT_FOUND` | `404 NOT FOUND` | Offer ID does not exist in provider inventory |
| `OFFER_EXPIRED` | `410 GONE` | Fare or room hold has expired |
| `PROVIDER_RATE_LIMITED` | `429 TOO MANY REQUESTS` | Provider upstream quota or rate limit exceeded |
| `CAPABILITY_NOT_SUPPORTED` | `501 NOT IMPLEMENTED` | Provider called for unsupported product type |
| `PROVIDER_UNAVAILABLE` | `503 SERVICE UNAVAILABLE` | Upstream provider connection failed or down |
| `PROVIDER_NOT_CONFIGURED` | Handled internally | Handled by `TravelSearchService` returning `SearchResponse.providerUnavailable` (Status 200 with empty list, preserving zero fake data) |

---

## 7. Swappability Proof (Test Verification)

Provider swappability was verified via `TravelProviderSwappabilityTest`:
1. In-memory providers `StubFlightProviderAlpha` (code: `"ALPHA"`) and `StubFlightProviderBeta` (code: `"BETA"`) were registered.
2. Search requests were executed with `travel.providers.flights = "ALPHA"`. Offers and metadata originated from Alpha.
3. Swapping configuration to `travel.providers.flights = "BETA"` immediately redirected traffic to Beta without altering any code.
4. Switching configuration to `"none"` routed requests safely to `NoConfiguredTravelProvider`, returning `PROVIDER_UNAVAILABLE` with zero fabricated data.
5. Offer revalidation accurately detected price increases using `BigDecimal.compareTo(...)`.

---

## 8. Integration Path for Phase 22 (Real Flight Provider)

To integrate a real flight provider (e.g., Amadeus or Duffel) in Phase 22:
1. Create `AmadeusFlightProvider` implementing `TravelProvider`.
2. Annotate with `@Component("amadeusFlightProvider")`.
3. Set `travel.providers.flights=AMADEUS` in profile configuration.
4. Inject API credentials securely via environment variables (e.g. `TRAVEL_AMADEUS_CLIENT_ID`, `TRAVEL_AMADEUS_CLIENT_SECRET`).
5. Zero changes needed to `TravelSearchController`, `TravelSearchService`, or Gateway routing.
