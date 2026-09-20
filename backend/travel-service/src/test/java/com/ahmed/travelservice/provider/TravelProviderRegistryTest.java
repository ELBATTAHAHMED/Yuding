package com.ahmed.travelservice.provider;

import com.ahmed.travelservice.config.TravelProviderProperties;
import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.NoConfiguredTravelProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TravelProviderRegistryTest {

    private TravelProviderProperties properties;
    private NoConfiguredTravelProvider noConfiguredProvider;
    private TravelProviderRegistry registry;

    @BeforeEach
    void setUp() {
        properties = new TravelProviderProperties();
        noConfiguredProvider = new NoConfiguredTravelProvider();
        registry = new TravelProviderRegistry(List.of(noConfiguredProvider), properties, noConfiguredProvider);
    }

    @Test
    @DisplayName("Default properties resolve NoConfiguredTravelProvider for all products")
    void defaultPropertiesResolveNoConfiguredProvider() {
        assertThat(registry.getProviderForProduct(TravelProduct.FLIGHTS))
                .isSameAs(noConfiguredProvider);
        assertThat(registry.getProviderForProduct(TravelProduct.HOTELS))
                .isSameAs(noConfiguredProvider);
        assertThat(registry.getProviderForProduct(TravelProduct.ACTIVITIES))
                .isSameAs(noConfiguredProvider);
        assertThat(registry.getProviderForProduct(TravelProduct.TRANSFERS))
                .isSameAs(noConfiguredProvider);
    }

    @Test
    @DisplayName("Registry discovers and retrieves provider by code")
    void registersAndRetrievesProvider() {
        TravelProvider customProvider = new MockProvider("CUSTOM", "Custom Provider", Set.of(ProviderCapability.FLIGHTS));
        registry.registerProvider(customProvider);

        TravelProvider resolved = registry.getProvider("CUSTOM");
        assertThat(resolved).isSameAs(customProvider);
        assertThat(resolved.getMetadata().getProviderCode()).isEqualTo("CUSTOM");
    }

    @Test
    @DisplayName("Configured provider with matching capability is successfully resolved")
    void resolvesConfiguredProviderWithCapability() {
        TravelProvider flightProvider = new MockProvider("SKY_PROVIDER", "Sky Provider", Set.of(ProviderCapability.FLIGHTS));
        registry.registerProvider(flightProvider);
        properties.setFlights("SKY_PROVIDER");

        TravelProvider activeFlightProvider = registry.getProviderForProduct(TravelProduct.FLIGHTS);
        assertThat(activeFlightProvider).isSameAs(flightProvider);
    }

    @Test
    @DisplayName("Configured provider lacking required capability throws TravelProviderException")
    void throwsExceptionWhenCapabilityMissing() {
        // Provider only supports HOTELS, but configured for FLIGHTS
        TravelProvider hotelOnlyProvider = new MockProvider("HOTEL_ONLY", "Hotel Only Provider", Set.of(ProviderCapability.HOTELS));
        registry.registerProvider(hotelOnlyProvider);
        properties.setFlights("HOTEL_ONLY");

        assertThatThrownBy(() -> registry.getProviderForProduct(TravelProduct.FLIGHTS))
                .isInstanceOf(TravelProviderException.class)
                .hasMessageContaining("does not support capability: FLIGHTS")
                .satisfies(ex -> assertThat(((TravelProviderException) ex).getErrorCode()).isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED));
    }

    @Test
    @DisplayName("Unknown configured provider falls back safely to NoConfiguredTravelProvider")
    void unknownProviderFallsBackToNone() {
        properties.setFlights("NON_EXISTENT_PROVIDER");

        TravelProvider provider = registry.getProviderForProduct(TravelProduct.FLIGHTS);
        assertThat(provider).isSameAs(noConfiguredProvider);
    }

    // Helper mock provider for registry testing
    private static class MockProvider implements TravelProvider {
        private final ProviderMetadata metadata;

        MockProvider(String code, String name, Set<ProviderCapability> capabilities) {
            this.metadata = ProviderMetadata.builder()
                    .providerCode(code)
                    .displayName(name)
                    .supportedCapabilities(capabilities)
                    .build();
        }

        @Override public ProviderMetadata getMetadata() { return metadata; }
        @Override public List<FlightOfferDto> searchFlights(FlightSearchQuery query) { return Collections.emptyList(); }
        @Override public List<HotelOfferDto> searchHotels(HotelSearchQuery query) { return Collections.emptyList(); }
        @Override public List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) { return Collections.emptyList(); }
        @Override public List<TransferOfferDto> searchTransfers(TransferSearchQuery query) { return Collections.emptyList(); }
        @Override public OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) { return null; }
    }
}
