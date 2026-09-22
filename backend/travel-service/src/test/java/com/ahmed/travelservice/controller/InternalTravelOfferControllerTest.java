package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.cache.OfferSelectionCache;
import com.ahmed.travelservice.dto.response.ResolvedOfferDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
class InternalTravelOfferControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OfferSelectionCache offerSelectionCache;

    @Test
    @DisplayName("GET /internal/travel/offers/resolve/{selectionRef} returns 200 when found")
    void resolveOfferFound() throws Exception {
        String ref = "valid-selection-ref-123";
        ResolvedOfferDto offer = ResolvedOfferDto.builder()
                .selectionRef(ref)
                .provider("SCRAPPA")
                .providerOfferId("scrappa-1234")
                .productType("FLIGHT")
                .providerAmount(new BigDecimal("120.50"))
                .providerCurrency("EUR")
                .displayAmount(new BigDecimal("1300.00"))
                .displayCurrency("MAD")
                .providerExpiresAt(Instant.parse("2026-09-22T10:15:00Z"))
                .snapshotExpiresAt(Instant.parse("2026-09-22T10:15:00Z"))
                .selectedDetails(Map.of("carrier", "Royal Air Maroc", "flightNumber", "AT200"))
                .build();

        when(offerSelectionCache.get(ref)).thenReturn(Optional.of(offer));

        mockMvc.perform(get("/internal/travel/offers/resolve/{selectionRef}", ref)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.selectionRef").value(ref))
                .andExpect(jsonPath("$.provider").value("SCRAPPA"))
                .andExpect(jsonPath("$.providerOfferId").value("scrappa-1234"))
                .andExpect(jsonPath("$.productType").value("FLIGHT"))
                .andExpect(jsonPath("$.providerAmount").value(120.50))
                .andExpect(jsonPath("$.providerCurrency").value("EUR"))
                .andExpect(jsonPath("$.displayAmount").value(1300.00))
                .andExpect(jsonPath("$.displayCurrency").value("MAD"))
                .andExpect(jsonPath("$.selectedDetails.carrier").value("Royal Air Maroc"));
    }

    @Test
    @DisplayName("GET /internal/travel/offers/resolve/{selectionRef} returns 404 when not found or expired")
    void resolveOfferNotFound() throws Exception {
        String ref = "non-existent-ref";
        when(offerSelectionCache.get(ref)).thenReturn(Optional.empty());

        mockMvc.perform(get("/internal/travel/offers/resolve/{selectionRef}", ref)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
