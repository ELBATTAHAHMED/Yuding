package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.PaymentCaptureRequestDto;
import com.ahmed.reservationservice.domain.dto.PaymentCaptureResponseDto;
import com.ahmed.reservationservice.domain.dto.PaymentDetailsDto;
import com.ahmed.reservationservice.domain.dto.PaymentOrderResponseDto;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.service.PaymentService;
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
@DisplayName("PaymentController Security & REST Tests")
class PaymentControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PaymentService paymentService;

    // Legacy context mocks
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private UtilisateurFeign utilisateurFeign;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private TransportsServices transportsServices;

    private final UUID userUuid = UUID.randomUUID();
    private final String validRef = "YUD-P9K2M4Q7";
    private final String validPayRef = "PAY-23456789";

    @Test
    @DisplayName("POST /bookings/{reference}/payment/create-order succeeds for authenticated owner")
    void createOrderSuccessForOwner() throws Exception {
        PaymentOrderResponseDto dto = PaymentOrderResponseDto.builder()
                .bookingReference(validRef)
                .paymentReference(validPayRef)
                .providerName("paypal-sandbox")
                .providerOrderId("5O190127TN364715T")
                .approvalUrl("https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T")
                .amount(new BigDecimal("120.00"))
                .currency("EUR")
                .status("REQUIRES_ACTION")
                .createdAt(Instant.now())
                .build();

        when(paymentService.initiatePaymentOrder(eq(validRef), any(), any(), eq(userUuid.toString()), any()))
                .thenReturn(dto);

        mockMvc.perform(post("/bookings/{reference}/payment/create-order", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bookingReference").value(validRef))
                .andExpect(jsonPath("$.paymentReference").value(validPayRef))
                .andExpect(jsonPath("$.amount").value(120.00))
                .andExpect(jsonPath("$.currency").value("EUR"))
                .andExpect(jsonPath("$.providerOrderId").value("5O190127TN364715T"));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/payment/create-order returns 401 Unauthorized when unauthenticated")
    void createOrderUnauthenticated() throws Exception {
        mockMvc.perform(post("/bookings/{reference}/payment/create-order", validRef)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /bookings/{reference}/payment/create-order returns 403 when non-owner accesses booking")
    void createOrderForbiddenForNonOwner() throws Exception {
        when(paymentService.initiatePaymentOrder(eq(validRef), any(), any(), eq(userUuid.toString()), any()))
                .thenThrow(new BookingOwnershipException("Access denied"));

        mockMvc.perform(post("/bookings/{reference}/payment/create-order", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /bookings/{reference}/payment/capture succeeds for authenticated owner")
    void capturePaymentSuccessForOwner() throws Exception {
        PaymentCaptureResponseDto dto = PaymentCaptureResponseDto.builder()
                .bookingReference(validRef)
                .paymentReference(validPayRef)
                .providerTransactionId("2C679124TG364715T")
                .paymentStatus("SUCCEEDED")
                .bookingStatus("PAID")
                .amount(new BigDecimal("120.00"))
                .currency("EUR")
                .message("Payment captured successfully. Booking is now PAID.")
                .build();

        when(paymentService.capturePayment(eq(validRef), any(PaymentCaptureRequestDto.class), eq(userUuid.toString()), any()))
                .thenReturn(dto);

        mockMvc.perform(post("/bookings/{reference}/payment/capture", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paymentReference\":\"" + validPayRef + "\"}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("SUCCEEDED"))
                .andExpect(jsonPath("$.bookingStatus").value("PAID"))
                .andExpect(jsonPath("$.providerTransactionId").value("2C679124TG364715T"));
    }

    @Test
    @DisplayName("GET /bookings/{reference}/payment returns payment details for owner")
    void getPaymentDetailsSuccess() throws Exception {
        PaymentDetailsDto dto = PaymentDetailsDto.builder()
                .paymentReference(validPayRef)
                .bookingReference(validRef)
                .providerName("paypal-sandbox")
                .providerOrderId("5O190127TN364715T")
                .amount(new BigDecimal("120.00"))
                .currency("EUR")
                .status("INITIATED")
                .build();

        when(paymentService.getPaymentDetails(eq(validRef), eq(userUuid.toString()), any()))
                .thenReturn(dto);

        mockMvc.perform(get("/bookings/{reference}/payment", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentReference").value(validPayRef))
                .andExpect(jsonPath("$.amount").value(120.00));
    }

    @Test
    @DisplayName("POST /bookings/{reference}/payment/capture rejects payload containing forbidden card credentials (cardNumber, cvv, pan)")
    void capturePaymentRejectsForbiddenCardCredentials() throws Exception {
        String forbiddenPayload = """
                {
                    "paymentReference": "%s",
                    "providerOrderId": "5O190127TN364715T",
                    "cardNumber": "4242424242424242",
                    "cvv": "123",
                    "expiry": "12/28"
                }
                """.formatted(validPayRef);

        mockMvc.perform(post("/bookings/{reference}/payment/capture", validRef)
                        .with(jwt().jwt(j -> j.subject(userUuid.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(forbiddenPayload)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Malformed request body or unrecognized/forbidden property provided"));
    }
}
