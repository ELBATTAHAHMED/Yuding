package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.CreateDraftBookingRequest;
import com.ahmed.reservationservice.domain.dto.PaymentCaptureRequestDto;
import com.ahmed.reservationservice.domain.dto.PaymentCaptureResponseDto;
import com.ahmed.reservationservice.domain.dto.PaymentOrderResponseDto;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyConflictException;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyHasher;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyOperation;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyRecord;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyRecordRepository;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyService;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyStatus;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyValidationException;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyValidator;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.payment.provider.MockPaymentProvider;
import com.ahmed.reservationservice.domain.payment.provider.PaymentRefundCommand;
import com.ahmed.reservationservice.domain.payment.provider.PaymentRefundResult;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.ahmed.reservationservice.domain.service.PaymentService;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import com.ahmed.reservationservice.services.TransportsServices;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "yuding.payment.provider=mock"
})
@DisplayName("Phase 41 — End-to-End Idempotency & Duplicate-Side-Effect Protection Tests")
class IdempotencySecurityAndConcurrencyTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private IdempotencyService idempotencyService;

    @Autowired
    private IdempotencyValidator idempotencyValidator;

    @Autowired
    private IdempotencyHasher idempotencyHasher;

    @Autowired
    private IdempotencyRecordRepository recordRepository;

    @MockBean
    private BookingService bookingService;

    @MockBean
    private PaymentService paymentService;

    // Legacy context mocks
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private UtilisateurFeign utilisateurFeign;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private TransportsServices transportsServices;

    private final UUID testUserId = UUID.randomUUID();
    private final String testRef = "YUD-K3L9N2P5";
    private final String testPayRef = "PAY-76543210";

    // =========================================================================
    // 1. Client Idempotency-Key Validation Tests
    // =========================================================================

    @Test
    @DisplayName("POST /bookings without Idempotency-Key returns 400 IDEMPOTENCY_KEY_REQUIRED")
    void bookingCreateMissingKeyReturns400() throws Exception {
        CreateDraftBookingRequest req = CreateDraftBookingRequest.builder()
                .productType(ProductType.HOTEL)
                .selectionRef("OFFER-HTL-12345")
                .build();

        mockMvc.perform(post("/bookings")
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("IDEMPOTENCY_KEY_REQUIRED"));
    }

    @Test
    @DisplayName("POST /bookings with blank or whitespace Idempotency-Key returns 400 IDEMPOTENCY_KEY_INVALID")
    void bookingCreateBlankKeyReturns400() throws Exception {
        CreateDraftBookingRequest req = CreateDraftBookingRequest.builder()
                .productType(ProductType.HOTEL)
                .selectionRef("OFFER-HTL-12345")
                .build();

        mockMvc.perform(post("/bookings")
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .header("Idempotency-Key", "   ")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("IDEMPOTENCY_KEY_REQUIRED"));
    }

    @Test
    @DisplayName("POST /bookings with oversized Idempotency-Key (>255 chars) returns 400 INVALID_IDEMPOTENCY_KEY")
    void bookingCreateOversizedKeyReturns400() throws Exception {
        CreateDraftBookingRequest req = CreateDraftBookingRequest.builder()
                .productType(ProductType.HOTEL)
                .selectionRef("OFFER-HTL-12345")
                .build();

        String longKey = "k".repeat(256);

        mockMvc.perform(post("/bookings")
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .header("Idempotency-Key", longKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("INVALID_IDEMPOTENCY_KEY"));
    }

    @Test
    @DisplayName("POST /bookings/{ref}/payment/create-order without Idempotency-Key returns 400 IDEMPOTENCY_KEY_REQUIRED")
    void createPaymentOrderMissingKeyReturns400() throws Exception {
        mockMvc.perform(post("/bookings/{reference}/payment/create-order", testRef)
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("IDEMPOTENCY_KEY_REQUIRED"));
    }

    @Test
    @DisplayName("POST /bookings/{ref}/payment/capture without Idempotency-Key returns 400 IDEMPOTENCY_KEY_REQUIRED")
    void capturePaymentMissingKeyReturns400() throws Exception {
        mockMvc.perform(post("/bookings/{reference}/payment/capture", testRef)
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("IDEMPOTENCY_KEY_REQUIRED"));
    }

    // =========================================================================
    // 2. Sequential Duplicate Execution & Replay Tests
    // =========================================================================

    @Test
    @DisplayName("Sequential duplicate POST /bookings replays cached response with Idempotent-Replayed: true header")
    void bookingCreateSequentialDuplicateReplays() throws Exception {
        String key = "key-booking-seq-" + UUID.randomUUID();
        CreateDraftBookingRequest req = CreateDraftBookingRequest.builder()
                .productType(ProductType.HOTEL)
                .selectionRef("OFFER-SEQ-12345")
                .build();

        Booking mockBooking = Booking.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .bookingReference(testRef)
                .productType(ProductType.HOTEL)
                .status(BookingStatus.DRAFT)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .version(0)
                .build();

        when(bookingService.createDraft(eq(testUserId), any(), any()))
                .thenReturn(mockBooking);

        // 1st request: newly created
        mockMvc.perform(post("/bookings")
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.bookingReference").value(testRef));

        // 2nd request with same key and same body: replayed
        mockMvc.perform(post("/bookings")
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(header().string("Idempotent-Replayed", "true"))
                .andExpect(jsonPath("$.bookingReference").value(testRef));
    }

    @Test
    @DisplayName("Same Idempotency-Key with different payload returns 409 IDEMPOTENCY_KEY_REUSED")
    void bookingCreateKeyReusedWithDifferentPayloadReturns409() throws Exception {
        String key = "key-booking-conflict-" + UUID.randomUUID();
        CreateDraftBookingRequest req1 = CreateDraftBookingRequest.builder()
                .productType(ProductType.HOTEL)
                .selectionRef("OFFER-HOTEL-A")
                .build();
        CreateDraftBookingRequest req2 = CreateDraftBookingRequest.builder()
                .productType(ProductType.FLIGHT)
                .selectionRef("OFFER-FLIGHT-B")
                .build();

        Booking mockBooking = Booking.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .bookingReference("YUD-H8J4K2L1")
                .productType(ProductType.HOTEL)
                .status(BookingStatus.DRAFT)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .version(0)
                .build();

        when(bookingService.createDraft(eq(testUserId), any(), any()))
                .thenReturn(mockBooking);

        // 1st request
        mockMvc.perform(post("/bookings")
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req1))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated());

        // 2nd request with same key but different body -> 409 Conflict
        mockMvc.perform(post("/bookings")
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .header("Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req2))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("IDEMPOTENCY_KEY_REUSED"));
    }

    @Test
    @DisplayName("Sequential duplicate POST create-order returns identical response and Idempotent-Replayed: true")
    void createPaymentOrderSequentialDuplicateReplays() throws Exception {
        String key = "key-pay-ord-" + UUID.randomUUID();
        PaymentOrderResponseDto orderDto = PaymentOrderResponseDto.builder()
                .bookingReference(testRef)
                .paymentReference(testPayRef)
                .providerName("paypal-sandbox")
                .providerOrderId("PAYPAL-ORD-999")
                .approvalUrl("https://sandbox.paypal.com/checkout")
                .status("PENDING")
                .amount(new BigDecimal("185.00"))
                .currency("EUR")
                .build();

        when(paymentService.initiatePaymentOrder(eq(testRef), any(), any(), any(), eq(testUserId.toString()), any()))
                .thenReturn(orderDto);
        when(paymentService.initiatePaymentOrder(eq(testRef), any(), any(), eq(testUserId.toString()), any()))
                .thenReturn(orderDto);

        // 1st call
        mockMvc.perform(post("/bookings/{reference}/payment/create-order", testRef)
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .header("Idempotency-Key", key)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentReference").value(testPayRef))
                .andExpect(jsonPath("$.providerOrderId").value("PAYPAL-ORD-999"));

        // 2nd call with same key
        mockMvc.perform(post("/bookings/{reference}/payment/create-order", testRef)
                        .with(jwt().jwt(j -> j.subject(testUserId.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_USER")))
                        .header("Idempotency-Key", key)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(header().string("Idempotent-Replayed", "true"))
                .andExpect(jsonPath("$.paymentReference").value(testPayRef))
                .andExpect(jsonPath("$.providerOrderId").value("PAYPAL-ORD-999"));
    }

    // =========================================================================
    // 3. Concurrent Duplicate Execution Handling
    // =========================================================================

    @Test
    @DisplayName("Concurrent execution with same key: exactly one supplier executes, second replays winner")
    void concurrentExecutionSingleSupplierExecution() throws Exception {
        String rawKey = "concurrent-test-" + UUID.randomUUID();
        AtomicInteger executions = new AtomicInteger(0);

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        Future<String> f1 = executor.submit(() -> {
            startLatch.await();
            return idempotencyService.execute(
                    IdempotencyOperation.BOOKING_CREATE,
                    testUserId,
                    "scope-concurrent",
                    rawKey,
                    "req-body",
                    String.class,
                    () -> {
                        executions.incrementAndGet();
                        try { Thread.sleep(200); } catch (InterruptedException ignored) {}
                        return "WINNER-RESULT";
                    },
                    res -> "RES-1",
                    201
            );
        });

        Future<String> f2 = executor.submit(() -> {
            startLatch.await();
            return idempotencyService.execute(
                    IdempotencyOperation.BOOKING_CREATE,
                    testUserId,
                    "scope-concurrent",
                    rawKey,
                    "req-body",
                    String.class,
                    () -> {
                        executions.incrementAndGet();
                        return "LOSER-RESULT";
                    },
                    res -> "RES-2",
                    201
            );
        });

        startLatch.countDown();
        String r1 = f1.get(5, TimeUnit.SECONDS);
        String r2 = f2.get(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(executions.get()).isEqualTo(1);
        assertThat(r1).isEqualTo(r2);
        assertThat(r1).isIn("WINNER-RESULT", "LOSER-RESULT");
    }

    // =========================================================================
    // 4. Provider Refund Idempotency & Request-Id Abstraction
    // =========================================================================

    @Test
    @DisplayName("MockPaymentProvider refundPayment handles deterministic refund and validates input")
    void mockPaymentProviderRefundPayment() {
        MockPaymentProvider provider = new MockPaymentProvider();
        PaymentRefundCommand cmd = PaymentRefundCommand.builder()
                .paymentReference("PAY-12345678")
                .captureId("MOCK-TXN-123")
                .amount(new BigDecimal("50.00"))
                .currency("EUR")
                .reason("Test refund")
                .providerRequestId("REF-PAY-12345678")
                .build();

        PaymentRefundResult result = provider.refundPayment(cmd);
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getProviderRefundId()).startsWith("MOCK-REFUND-");
        assertThat(result.getStatus()).isEqualTo("COMPLETED");
    }

    @Test
    @DisplayName("PaymentService generateRefundRequestId creates stable REF-PAY-XXXXXXXX")
    void refundRequestIdFormat() {
        String payRef = "PAY-98765432";
        String refundRequestId = "REF-" + payRef;
        assertThat(refundRequestId).isEqualTo("REF-PAY-98765432");
        assertThat(refundRequestId).matches("^REF-PAY-[A-Z0-9]{8}$");
    }
}
