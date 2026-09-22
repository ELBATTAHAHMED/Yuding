package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.domain.query.FlightSearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.FlightOfferDto;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.provider.TravelProduct;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
@Slf4j
public class FlightOfferRevalidator implements OfferRevalidator {

    private final TravelProviderRegistry providerRegistry;

    public FlightOfferRevalidator(TravelProviderRegistry providerRegistry) {
        this.providerRegistry = providerRegistry;
    }

    @Override
    public boolean supports(String productType) {
        return "FLIGHT".equalsIgnoreCase(productType) || "FLIGHTS".equalsIgnoreCase(productType);
    }

    @Override
    public InternalRevalidationResultDto revalidate(InternalRevalidateOfferRequest request) throws TravelProviderException {
        Map<String, Object> details = request.getSelectedDetails();
        if (details == null || details.isEmpty()) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Missing flight snapshot details for live revalidation"
            );
        }

        String origin = (String) details.get("origin");
        String destination = (String) details.get("destination");
        String departureTimeStr = (String) details.get("departureTime");
        String airlineCode = (String) details.get("airlineCode");
        String flightNumber = (String) details.get("flightNumber");
        String cabinClassStr = (String) details.get("cabinClass");

        LocalDate departureDate = extractDepartureDate(departureTimeStr, details);
        if (origin == null || destination == null || departureDate == null) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Insufficient route or date details for live flight search"
            );
        }

        TravelClass travelClass = TravelClass.ECONOMY;
        if (cabinClassStr != null) {
            try {
                travelClass = TravelClass.valueOf(cabinClassStr.toUpperCase());
            } catch (Exception ignored) {}
        }

        FlightSearchQuery query = FlightSearchQuery.builder()
                .origin(origin)
                .destination(destination)
                .departureDate(departureDate)
                .adults(1)
                .travelClass(travelClass)
                .currency(request.getSnapshotProviderCurrency() != null ? request.getSnapshotProviderCurrency() : "EUR")
                .build();

        TravelProvider provider = resolveProvider(request.getProvider());
        log.info("[FlightRevalidator] Executing LIVE search with cache bypass: {} -> {} on {}", origin, destination, departureDate);
        List<FlightOfferDto> freshOffers = provider.searchFlights(query);

        FlightOfferDto matchedOffer = findExactMatch(freshOffers, request.getProviderOfferId(), airlineCode, flightNumber, departureTimeStr);

        Instant now = Instant.now();
        if (matchedOffer != null) {
            OfferPriceStatus priceStatus = OfferPriceComparator.comparePrices(
                    request.getSnapshotProviderAmount(),
                    request.getSnapshotProviderCurrency(),
                    matchedOffer.getPrice(),
                    matchedOffer.getCurrency()
            );

            return InternalRevalidationResultDto.builder()
                    .productType(request.getProductType())
                    .provider(matchedOffer.getProvider() != null ? matchedOffer.getProvider() : request.getProvider())
                    .providerOfferId(request.getProviderOfferId())
                    .matchedProviderOfferId(matchedOffer.getOfferId())
                    .availabilityStatus(OfferAvailabilityStatus.AVAILABLE)
                    .priceStatus(priceStatus)
                    .snapshotProviderAmount(request.getSnapshotProviderAmount())
                    .snapshotProviderCurrency(request.getSnapshotProviderCurrency())
                    .currentProviderAmount(matchedOffer.getPrice())
                    .currentProviderCurrency(matchedOffer.getCurrency())
                    .revalidatedAt(now)
                    .providerExpiresAt(request.getProviderExpiresAt())
                    .message("Flight offer successfully revalidated live with provider")
                    .build();
        }

        return InternalRevalidationResultDto.builder()
                .productType(request.getProductType())
                .provider(request.getProvider())
                .providerOfferId(request.getProviderOfferId())
                .availabilityStatus(OfferAvailabilityStatus.UNAVAILABLE)
                .priceStatus(OfferPriceStatus.NOT_AVAILABLE)
                .snapshotProviderAmount(request.getSnapshotProviderAmount())
                .snapshotProviderCurrency(request.getSnapshotProviderCurrency())
                .revalidatedAt(now)
                .message("Selected flight itinerary is no longer available from provider")
                .build();
    }

    private TravelProvider resolveProvider(String providerCode) {
        if (providerCode != null && !providerCode.isBlank()) {
            try {
                TravelProvider p = providerRegistry.getProvider(providerCode);
                if (p != null) return p;
            } catch (Exception ignored) {}
        }
        TravelProvider p = providerRegistry.getProviderForProduct(TravelProduct.FLIGHTS);
        if (p == null) {
            throw TravelProviderException.notConfigured(providerCode != null ? providerCode : "FLIGHTS", "Flight provider not configured");
        }
        return p;
    }

    private LocalDate extractDepartureDate(String departureTimeStr, Map<String, Object> details) {
        if (departureTimeStr != null && departureTimeStr.length() >= 10) {
            try {
                return LocalDate.parse(departureTimeStr.substring(0, 10));
            } catch (Exception ignored) {}
        }
        Object departureDateObj = details.get("departureDate");
        if (departureDateObj instanceof String dStr && dStr.length() >= 10) {
            try {
                return LocalDate.parse(dStr.substring(0, 10));
            } catch (Exception ignored) {}
        }
        return null;
    }

    private FlightOfferDto findExactMatch(List<FlightOfferDto> offers, String providerOfferId, String airlineCode, String flightNumber, String departureTimeStr) {
        if (offers == null || offers.isEmpty()) return null;

        // 1. Match by provider offer ID if present
        if (providerOfferId != null && !providerOfferId.isBlank()) {
            for (FlightOfferDto o : offers) {
                if (providerOfferId.equalsIgnoreCase(o.getOfferId())) {
                    return o;
                }
            }
        }

        // 2. Exact match by airline + flight number + departure time
        for (FlightOfferDto o : offers) {
            boolean airlineMatches = airlineCode == null || airlineCode.equalsIgnoreCase(o.getAirlineCode());
            boolean flightNumMatches = flightNumber == null || flightNumber.equalsIgnoreCase(o.getFlightNumber());
            boolean timeMatches = departureTimeStr == null || Objects.equals(departureTimeStr, o.getDepartureTime());

            if (airlineMatches && flightNumMatches && timeMatches) {
                return o;
            }
        }

        return null;
    }
}
