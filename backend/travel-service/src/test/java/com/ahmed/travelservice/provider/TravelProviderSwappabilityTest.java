package com.ahmed.travelservice.provider;

import com.ahmed.travelservice.config.TravelProviderProperties;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.RevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.NoConfiguredTravelProvider;
import com.ahmed.travelservice.service.TravelSearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Proves provider swappability: swapping the active provider via configuration
 * routes requests without any changes to controller or TravelSearchService.
 */
class TravelProviderSwappabilityTest {

    private TravelProviderProperties properties;
    private NoConfiguredTravelProvider noConfiguredProvider;
    private TravelProviderRegistry registry;
    private TravelSearchService searchService;

    private StubFlightProviderAlpha providerAlpha;
    private StubFlightProviderBeta providerBeta;

    @BeforeEach
    void setUp() {
        properties = new TravelProviderProperties();
        noConfiguredProvider = new NoConfiguredTravelProvider();
        registry = new TravelProviderRegistry(List.of(noConfiguredProvider), properties, noConfiguredProvider);
        searchService = new TravelSearchService(registry);

        providerAlpha = new StubFlightProviderAlpha();
        providerBeta = new StubFlightProviderBeta();

        registry.registerProvider(providerAlpha);
        registry.registerProvider(providerBeta);
    }

    @Test
    @DisplayName("Default configuration (none) returns clean PROVIDER_UNAVAILABLE status without errors")
    void defaultConfigurationReturnsProviderUnavailable() {
        FlightSearchRequest req = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().plusDays(7))
                .adults(1)
                .build();

        SearchResponse<FlightOfferDto> response = searchService.searchFlights(req);

        assertThat(response.getStatus()).isEqualTo("PROVIDER_UNAVAILABLE");
        assertThat(response.getTotalResults()).isEqualTo(0);
        assertThat(response.getResults()).isEmpty();
        assertThat(response.getMessage()).contains("No live flight provider is configured");
    }

    @Test
    @DisplayName("Configuring provider ALPHA dynamically routes search to ALPHA without code change")
    void swappingToProviderAlphaRoutesToAlpha() {
        properties.setFlights("ALPHA");

        FlightSearchRequest req = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().plusDays(7))
                .adults(1)
                .build();

        SearchResponse<FlightOfferDto> response = searchService.searchFlights(req);

        assertThat(response.getStatus()).isEqualTo("SUCCESS");
        assertThat(response.getTotalResults()).isEqualTo(1);
        assertThat(response.getResults()).hasSize(1);
        FlightOfferDto offer = response.getResults().get(0);
        assertThat(offer.getProvider()).isEqualTo("ALPHA");
        assertThat(offer.getAirlineName()).isEqualTo("Alpha Airways");
        assertThat(offer.getPrice()).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("Switching configuration from ALPHA to BETA dynamically routes to BETA without modifying service")
    void switchingToProviderBetaRoutesToBeta() {
        properties.setFlights("BETA");

        FlightSearchRequest req = FlightSearchRequest.builder()
                .origin("Madrid (MAD)")
                .destination("Marrakech (RAK)")
                .departureDate(LocalDate.now().plusDays(10))
                .adults(2)
                .build();

        SearchResponse<FlightOfferDto> response = searchService.searchFlights(req);

        assertThat(response.getStatus()).isEqualTo("SUCCESS");
        assertThat(response.getTotalResults()).isEqualTo(1);
        assertThat(response.getResults()).hasSize(1);
        FlightOfferDto offer = response.getResults().get(0);
        assertThat(offer.getProvider()).isEqualTo("BETA");
        assertThat(offer.getAirlineName()).isEqualTo("Beta Jet");
        assertThat(offer.getPrice()).isEqualByComparingTo(new BigDecimal("220.50"));
    }

    @Test
    @DisplayName("Offer revalidation dynamically delegates to the designated provider")
    void revalidationDelegatesToTargetProvider() {
        RevalidateOfferRequest request = RevalidateOfferRequest.builder()
                .offerId("alpha-offer-999")
                .provider("ALPHA")
                .productType(TravelProduct.FLIGHTS)
                .originalPrice(new BigDecimal("150.00"))
                .currency("EUR")
                .build();

        OfferRevalidationResult result = searchService.revalidateOffer(request);

        assertThat(result.isAvailable()).isTrue();
        assertThat(result.getProvider()).isEqualTo("ALPHA");
        assertThat(result.getCurrentPrice()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(result.isPriceChanged()).isFalse();
    }

    @Test
    @DisplayName("Offer revalidation detects price changes accurately using BigDecimal")
    void revalidationDetectsPriceChange() {
        RevalidateOfferRequest request = RevalidateOfferRequest.builder()
                .offerId("beta-offer-888")
                .provider("BETA")
                .productType(TravelProduct.FLIGHTS)
                .originalPrice(new BigDecimal("200.00")) // Original was 200, BETA returns 220.50
                .currency("EUR")
                .build();

        OfferRevalidationResult result = searchService.revalidateOffer(request);

        assertThat(result.isAvailable()).isTrue();
        assertThat(result.getProvider()).isEqualTo("BETA");
        assertThat(result.getCurrentPrice()).isEqualByComparingTo(new BigDecimal("220.50"));
        assertThat(result.isPriceChanged()).isTrue();
    }

    // ==================== STUB PROVIDERS FOR TESTING ONLY ====================

    private static class StubFlightProviderAlpha implements TravelProvider {
        private final ProviderMetadata metadata = ProviderMetadata.builder()
                .providerCode("ALPHA")
                .displayName("Stub Alpha Provider")
                .supportedCapabilities(Set.of(ProviderCapability.FLIGHTS, ProviderCapability.REVALIDATION))
                .build();

        @Override public ProviderMetadata getMetadata() { return metadata; }

        @Override
        public List<FlightOfferDto> searchFlights(FlightSearchQuery query) {
            return List.of(FlightOfferDto.builder()
                    .offerId("alpha-offer-001")
                    .provider("ALPHA")
                    .airlineCode("AA")
                    .airlineName("Alpha Airways")
                    .flightNumber("AA101")
                    .origin(query.getOrigin())
                    .destination(query.getDestination())
                    .departureTime(Instant.now().plusSeconds(86400 * 7))
                    .arrivalTime(Instant.now().plusSeconds(86400 * 7 + 10800))
                    .cabinClass(query.getTravelClass().name())
                    .price(new BigDecimal("150.00"))
                    .currency(query.getCurrency())
                    .availableSeats(5)
                    .build());
        }

        @Override public List<HotelOfferDto> searchHotels(HotelSearchQuery query) { return Collections.emptyList(); }
        @Override public List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) { return Collections.emptyList(); }
        @Override public List<TransferOfferDto> searchTransfers(TransferSearchQuery query) { return Collections.emptyList(); }

        @Override
        public OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) {
            BigDecimal currentPrice = new BigDecimal("150.00");
            boolean changed = query.getOriginalPrice() != null && query.getOriginalPrice().compareTo(currentPrice) != 0;
            return OfferRevalidationResult.builder()
                    .offerId(query.getOfferId())
                    .provider("ALPHA")
                    .available(true)
                    .currentPrice(currentPrice)
                    .currency("EUR")
                    .priceChanged(changed)
                    .providerOfferReference("REF-ALPHA-123")
                    .expiresAt(Instant.now().plusSeconds(1800))
                    .message("Offer revalidated successfully")
                    .build();
        }
    }

    private static class StubFlightProviderBeta implements TravelProvider {
        private final ProviderMetadata metadata = ProviderMetadata.builder()
                .providerCode("BETA")
                .displayName("Stub Beta Provider")
                .supportedCapabilities(Set.of(ProviderCapability.FLIGHTS, ProviderCapability.REVALIDATION))
                .build();

        @Override public ProviderMetadata getMetadata() { return metadata; }

        @Override
        public List<FlightOfferDto> searchFlights(FlightSearchQuery query) {
            return List.of(FlightOfferDto.builder()
                    .offerId("beta-offer-002")
                    .provider("BETA")
                    .airlineCode("BJ")
                    .airlineName("Beta Jet")
                    .flightNumber("BJ202")
                    .origin(query.getOrigin())
                    .destination(query.getDestination())
                    .departureTime(Instant.now().plusSeconds(86400 * 10))
                    .arrivalTime(Instant.now().plusSeconds(86400 * 10 + 14400))
                    .cabinClass(query.getTravelClass().name())
                    .price(new BigDecimal("220.50"))
                    .currency(query.getCurrency())
                    .availableSeats(2)
                    .build());
        }

        @Override public List<HotelOfferDto> searchHotels(HotelSearchQuery query) { return Collections.emptyList(); }
        @Override public List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) { return Collections.emptyList(); }
        @Override public List<TransferOfferDto> searchTransfers(TransferSearchQuery query) { return Collections.emptyList(); }

        @Override
        public OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) {
            BigDecimal currentPrice = new BigDecimal("220.50");
            boolean changed = query.getOriginalPrice() != null && query.getOriginalPrice().compareTo(currentPrice) != 0;
            return OfferRevalidationResult.builder()
                    .offerId(query.getOfferId())
                    .provider("BETA")
                    .available(true)
                    .currentPrice(currentPrice)
                    .currency("EUR")
                    .priceChanged(changed)
                    .providerOfferReference("REF-BETA-456")
                    .expiresAt(Instant.now().plusSeconds(1200))
                    .message("Offer revalidated successfully")
                    .build();
        }
    }
}
