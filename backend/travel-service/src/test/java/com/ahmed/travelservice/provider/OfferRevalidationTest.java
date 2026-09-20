package com.ahmed.travelservice.provider;

import com.ahmed.travelservice.config.TravelProviderProperties;
import com.ahmed.travelservice.dto.request.RevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.OfferRevalidationResult;
import com.ahmed.travelservice.provider.impl.NoConfiguredTravelProvider;
import com.ahmed.travelservice.service.TravelSearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OfferRevalidationTest {

    private TravelSearchService searchService;

    @BeforeEach
    void setUp() {
        TravelProviderProperties properties = new TravelProviderProperties();
        NoConfiguredTravelProvider noConfiguredProvider = new NoConfiguredTravelProvider();
        TravelProviderRegistry registry = new TravelProviderRegistry(List.of(noConfiguredProvider), properties, noConfiguredProvider);
        searchService = new TravelSearchService(registry);
    }

    @Test
    @DisplayName("Revalidation when no provider configured returns unavailable result cleanly")
    void revalidationWithoutConfiguredProviderReturnsUnavailable() {
        RevalidateOfferRequest request = RevalidateOfferRequest.builder()
                .offerId("unconfigured-offer-123")
                .productType(TravelProduct.FLIGHTS)
                .originalPrice(new BigDecimal("120.00"))
                .currency("EUR")
                .build();

        OfferRevalidationResult result = searchService.revalidateOffer(request);

        assertThat(result).isNotNull();
        assertThat(result.isAvailable()).isFalse();
        assertThat(result.getOfferId()).isEqualTo("unconfigured-offer-123");
        assertThat(result.getCurrentPrice()).isNull();
        assertThat(result.getMessage()).contains("Offer revalidation is unavailable because no live external provider is configured");
    }
}
