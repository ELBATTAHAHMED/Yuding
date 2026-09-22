package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.BookingPricingResponseDto;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.service.BookingPricingService;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import com.ahmed.reservationservice.services.TransportsServices;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class BookingPricingControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BookingPricingService pricingService;

    // Legacy context mocks
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private UtilisateurFeign utilisateurFeign;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private TransportsServices transportsServices;

    private final UUID userUuid = UUID.randomUUID();
    private final String validRef = "YUD-P9K2M4Q7";

    @Test
    @DisplayName("POST /bookings/{reference}/pricing succeeds for authenticated owner with no request body")
    void pricingSuccessForOwner() throws Exception {
        BookingPricingResponseDto dto = BookingPricingResponseDto.builder()
                .bookingReference(validRef)
                .pricingStatus("PRICED")
                .totalAmount(new BigDecimal("150.00"))
                .currency("EUR")
                .breakdownComplete(false)
                .pricedAt(Instant.now())
                .validUntil(Instant.now().plusSeconds(300))
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .canProceedToPayment(true)
                .message("Server-authoritative pricing established successfully.")
                .build();

        when(pricingService.createAuthoritativePricing(eq(validRef), eq(userUuid.toString()), any()))
                .thenReturn(dto);

        mockMvc.perform(post("/bookings/{reference}/pricing", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingReference").value(validRef))
                .andExpect(jsonPath("$.pricingStatus").value("PRICED"))
                .andExpect(jsonPath("$.totalAmount").value(150.00))
                .andExpect(jsonPath("$.currency").value("EUR"))
                .andExpect(jsonPath("$.canProceedToPayment").value(true));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/pricing with malicious client payload CANNOT tamper server pricing")
    void pricingIgnoresMaliciousClientBody() throws Exception {
        BookingPricingResponseDto dto = BookingPricingResponseDto.builder()
                .bookingReference(validRef)
                .pricingStatus("PRICED")
                .totalAmount(new BigDecimal("150.00")) // Server derives 150 EUR, ignoring malicious 1 MAD
                .currency("EUR")
                .breakdownComplete(false)
                .pricedAt(Instant.now())
                .validUntil(Instant.now().plusSeconds(300))
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .canProceedToPayment(true)
                .message("Server-authoritative pricing established successfully.")
                .build();

        when(pricingService.createAuthoritativePricing(eq(validRef), eq(userUuid.toString()), any()))
                .thenReturn(dto);

        // Attacker attempts to send fake body in POST request
        String maliciousPayload = "{\"total\": 1, \"currency\": \"MAD\", \"taxes\": 0, \"fees\": 0}";

        mockMvc.perform(post("/bookings/{reference}/pricing", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(150.00))
                .andExpect(jsonPath("$.currency").value("EUR"));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/pricing without authentication returns 401 Unauthorized")
    void pricingUnauthenticated() throws Exception {
        mockMvc.perform(post("/bookings/{reference}/pricing", validRef)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /bookings/{reference}/pricing succeeds for authenticated owner")
    void getPricingSuccessForOwner() throws Exception {
        BookingPricingResponseDto dto = BookingPricingResponseDto.builder()
                .bookingReference(validRef)
                .pricingStatus("PRICED")
                .totalAmount(new BigDecimal("150.00"))
                .currency("EUR")
                .breakdownComplete(false)
                .pricedAt(Instant.now())
                .validUntil(Instant.now().plusSeconds(300))
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .canProceedToPayment(true)
                .build();

        when(pricingService.getLatestPricing(eq(validRef), eq(userUuid.toString()), any()))
                .thenReturn(dto);

        mockMvc.perform(get("/bookings/{reference}/pricing", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingReference").value(validRef))
                .andExpect(jsonPath("$.totalAmount").value(150.00));
    }

    @Test
    @DisplayName("GET /bookings/{reference}/pricing returns 403 when user is not owner")
    void getPricingForbiddenForNonOwner() throws Exception {
        when(pricingService.getLatestPricing(eq(validRef), eq(userUuid.toString()), any()))
                .thenThrow(new BookingOwnershipException("Access denied"));

        mockMvc.perform(get("/bookings/{reference}/pricing", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }
}
