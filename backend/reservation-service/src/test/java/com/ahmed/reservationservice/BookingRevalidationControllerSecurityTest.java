package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.BookingRevalidationResponseDto;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.service.BookingRevalidationService;
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
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
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
class BookingRevalidationControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BookingRevalidationService revalidationService;

    // Legacy context mocks
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private UtilisateurFeign utilisateurFeign;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private TransportsServices transportsServices;

    private final UUID userUuid = UUID.randomUUID();
    private final String validRef = "YUD-K7M4P2Q8";

    @Test
    @DisplayName("POST /bookings/{reference}/revalidate succeeds for authenticated booking owner")
    void revalidateSuccessForOwner() throws Exception {
        BookingRevalidationResponseDto dto = BookingRevalidationResponseDto.builder()
                .bookingReference(validRef)
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .previousProviderAmount(new BigDecimal("150.00"))
                .previousProviderCurrency("EUR")
                .currentProviderAmount(new BigDecimal("150.00"))
                .currentProviderCurrency("EUR")
                .revalidatedAt(Instant.now())
                .validUntil(Instant.now().plusSeconds(300))
                .canProceedToPricing(true)
                .message("Revalidation passed")
                .build();

        when(revalidationService.revalidateBooking(eq(validRef), eq(userUuid.toString()), any()))
                .thenReturn(dto);

        mockMvc.perform(post("/bookings/{reference}/revalidate", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingReference").value(validRef))
                .andExpect(jsonPath("$.availabilityStatus").value("AVAILABLE"))
                .andExpect(jsonPath("$.priceStatus").value("UNCHANGED"))
                .andExpect(jsonPath("$.canProceedToPricing").value(true));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/revalidate without authentication returns 401 Unauthorized")
    void revalidateUnauthenticated() throws Exception {
        mockMvc.perform(post("/bookings/{reference}/revalidate", validRef)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /bookings/{reference}/revalidate for non-owned booking returns 403 Forbidden")
    void revalidateNonOwnedForbidden() throws Exception {
        when(revalidationService.revalidateBooking(eq(validRef), eq(userUuid.toString()), any()))
                .thenThrow(new BookingOwnershipException("Access denied"));

        mockMvc.perform(post("/bookings/{reference}/revalidate", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /bookings/{reference}/revalidation/accept-price-change succeeds for owner")
    void acceptPriceChangeSuccess() throws Exception {
        BookingRevalidationResponseDto dto = BookingRevalidationResponseDto.builder()
                .bookingReference(validRef)
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .availabilityStatus("AVAILABLE")
                .priceStatus("CHANGED")
                .previousProviderAmount(new BigDecimal("150.00"))
                .previousProviderCurrency("EUR")
                .currentProviderAmount(new BigDecimal("175.00"))
                .currentProviderCurrency("EUR")
                .priceChangeAccepted(true)
                .canProceedToPricing(true)
                .message("Price change acknowledged")
                .build();

        when(revalidationService.acceptPriceChange(eq(validRef), eq(userUuid.toString()), any()))
                .thenReturn(dto);

        mockMvc.perform(post("/bookings/{reference}/revalidation/accept-price-change", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.priceChangeAccepted").value(true))
                .andExpect(jsonPath("$.canProceedToPricing").value(true));
    }
}
