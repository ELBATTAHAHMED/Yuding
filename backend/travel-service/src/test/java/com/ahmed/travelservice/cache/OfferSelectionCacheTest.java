package com.ahmed.travelservice.cache;

import com.ahmed.travelservice.dto.response.ResolvedOfferDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class OfferSelectionCacheTest {

    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    @DisplayName("OfferSelectionCache stores and retrieves ResolvedOfferDto in memory fallback")
    void testInMemoryFallbackStoreAndRetrieve() {
        OfferSelectionCache cache = new OfferSelectionCache(null, objectMapper);

        ResolvedOfferDto offer = ResolvedOfferDto.builder()
                .selectionRef("test-ref-123")
                .provider("TEST_PROVIDER")
                .providerOfferId("offer-999")
                .productType("FLIGHT")
                .providerAmount(new BigDecimal("150.00"))
                .providerCurrency("EUR")
                .displayAmount(new BigDecimal("1600.00"))
                .displayCurrency("MAD")
                .providerExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES))
                .snapshotExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES))
                .selectedDetails(Map.of("airline", "AT", "flightNumber", "AT800"))
                .build();

        cache.put("test-ref-123", offer);

        Optional<ResolvedOfferDto> retrieved = cache.get("test-ref-123");
        assertTrue(retrieved.isPresent());
        assertEquals("TEST_PROVIDER", retrieved.get().getProvider());
        assertEquals("offer-999", retrieved.get().getProviderOfferId());
        assertEquals("FLIGHT", retrieved.get().getProductType());
        assertEquals(new BigDecimal("150.00"), retrieved.get().getProviderAmount());
    }

    @Test
    @DisplayName("OfferSelectionCache returns empty for unknown or null key")
    void testUnknownKeyReturnsEmpty() {
        OfferSelectionCache cache = new OfferSelectionCache(null, objectMapper);
        assertTrue(cache.get("non-existent").isEmpty());
        assertTrue(cache.get(null).isEmpty());
    }
}
