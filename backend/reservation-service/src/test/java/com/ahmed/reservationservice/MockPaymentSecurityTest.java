package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.PaymentCaptureRequestDto;
import com.ahmed.reservationservice.domain.dto.PaymentCaptureResponseDto;
import com.ahmed.reservationservice.domain.dto.PaymentOrderResponseDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import com.ahmed.reservationservice.domain.payment.provider.MockPaymentProvider;
import com.ahmed.reservationservice.domain.payment.provider.PayPalSandboxPaymentProvider;
import com.ahmed.reservationservice.domain.payment.provider.PaymentCaptureResult;
import com.ahmed.reservationservice.domain.payment.provider.PaymentProviderRegistry;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
import com.ahmed.reservationservice.domain.service.PaymentService;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import com.ahmed.reservationservice.services.TransportsServices;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("dev")
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false"
})
@Transactional
class MockPaymentSecurityTest {

    @Autowired private PaymentService paymentService;
    @Autowired private PaymentProviderRegistry providerRegistry;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private ServerPricingQuoteRepository quoteRepository;
    @Autowired private OfferRevalidationRepository revalidationRepository;
    @Autowired private OfferSnapshotRepository snapshotRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private BookingReferenceGenerator bookingRefGenerator;

    // Legacy mock beans to prevent application context failures
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private TransportsServices transportsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private UtilisateurFeign utilisateurFeign;

    private UUID userId;
    private String bookingReference;
    private Booking testBooking;
    private ServerPricingQuote testQuote;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        bookingReference = bookingRefGenerator.generate();

        testBooking = Booking.createDraft(userId, ProductType.HOTEL, bookingReference, Instant.now(), null);
        testBooking = bookingRepository.save(testBooking);

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .booking(testBooking)
                .productType(ProductType.HOTEL)
                .provider("NUITEE")
                .providerOfferId("OFFER-PAY-1")
                .selectedDetails(Map.of("hotel", "Hilton"))
                .providerAmount(new BigDecimal("246.00"))
                .providerCurrency("EUR")
                .snapshotExpiresAt(Instant.now().plusSeconds(600))
                .capturedAt(Instant.now())
                .snapshotHash("e".repeat(64))
                .build();
        snapshot = snapshotRepository.save(snapshot);

        OfferRevalidation reval = OfferRevalidation.builder()
                .bookingId(testBooking.getId())
                .offerSnapshotId(snapshot.getId())
                .provider("NUITEE")
                .productType("HOTEL")
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .currentProviderAmount(new BigDecimal("246.00"))
                .currentProviderCurrency("EUR")
                .validUntil(Instant.now().plusSeconds(300))
                .build();
        reval = revalidationRepository.save(reval);

        testQuote = ServerPricingQuote.builder()
                .bookingId(testBooking.getId())
                .offerSnapshotId(snapshot.getId())
                .revalidationId(reval.getId())
                .productType("HOTEL")
                .provider("NUITEE")
                .pricingStatus(PricingStatus.PRICED)
                .baseAmount(new BigDecimal("200.00"))
                .taxAmount(new BigDecimal("46.00"))
                .feeAmount(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("246.00"))
                .currency("EUR")
                .validUntil(reval.getValidUntil())
                .pricingHash("f".repeat(64))
                .version(0)
                .build();
        testQuote = quoteRepository.save(testQuote);
    }

    @Test
    @DisplayName("DEMO_CARD payment mode initiates order with MockPaymentProvider using authoritative ServerPricingQuote")
    void testDemoCardInitiatesMockPaymentOrder() {
        PaymentOrderResponseDto order = paymentService.initiatePaymentOrder(
                bookingReference,
                "http://localhost:3000/bookings/" + bookingReference,
                "http://localhost:3000/booking/" + bookingReference,
                "DEMO_CARD",
                userId.toString(),
                List.of("ROLE_USER")
        );

        assertThat(order).isNotNull();
        assertThat(order.getBookingReference()).isEqualTo(bookingReference);
        assertThat(order.getProviderName()).isEqualTo(MockPaymentProvider.PROVIDER_NAME);
        assertThat(order.getPaymentReference()).startsWith("PAY-");
        // Server pricing quote strictly determines amount (246.00 EUR)
        assertThat(order.getAmount()).isEqualByComparingTo(new BigDecimal("246.00"));
        assertThat(order.getCurrency()).isEqualTo("EUR");

        // Verify persisted payment row in database
        Payment persisted = paymentRepository.findByPaymentReference(order.getPaymentReference()).orElseThrow();
        assertThat(persisted.getProviderName()).isEqualTo(MockPaymentProvider.PROVIDER_NAME);
        assertThat(persisted.getAmount()).isEqualByComparingTo(new BigDecimal("246.00"));
        assertThat(persisted.getCurrency()).isEqualTo("EUR");
    }

    @Test
    @DisplayName("Capturing DEMO_CARD Mock payment transitions Payment to SUCCEEDED and Booking to PAID (NOT CONFIRMED)")
    void testMockPaymentCaptureTransitionsBookingToPaidNotConfirmed() {
        PaymentOrderResponseDto order = paymentService.initiatePaymentOrder(
                bookingReference,
                "http://localhost:3000/bookings/" + bookingReference,
                "http://localhost:3000/booking/" + bookingReference,
                "DEMO_CARD",
                userId.toString(),
                List.of("ROLE_USER")
        );

        PaymentCaptureResponseDto capture = paymentService.capturePayment(
                bookingReference,
                PaymentCaptureRequestDto.builder()
                        .paymentReference(order.getPaymentReference())
                        .providerOrderId(order.getProviderOrderId())
                        .build(),
                userId.toString(),
                List.of("ROLE_USER")
        );

        assertThat(capture).isNotNull();
        assertThat(capture.getPaymentStatus()).isEqualTo(PaymentStatus.SUCCEEDED.name());
        assertThat(capture.getBookingStatus()).isEqualTo(BookingStatus.PAID.name());

        // Inspect booking in database: MUST be PAID, and strictly NOT CONFIRMED
        Booking reloadedBooking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(reloadedBooking.getStatus()).isEqualTo(BookingStatus.PAID);
        assertThat(reloadedBooking.getStatus()).isNotEqualTo(BookingStatus.CONFIRMED);

        // Inspect payment in database
        Payment reloadedPayment = paymentRepository.findByPaymentReference(order.getPaymentReference()).orElseThrow();
        assertThat(reloadedPayment.getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(reloadedPayment.getProviderTransactionId()).isNotBlank();
    }

    @Test
    @DisplayName("SECURITY BARRIER: completeMockPayment strictly forbids completing non-mock/PayPal payments")
    void testMockCompletionCannotCompletePayPalPayment() {
        Payment paypalPayment = Payment.builder()
                .bookingId(testBooking.getId())
                .paymentReference("PAY-PAYPAL01")
                .pricingQuoteId(testQuote.getId())
                .providerName(PayPalSandboxPaymentProvider.PROVIDER_NAME)
                .amount(new BigDecimal("246.00"))
                .currency("EUR")
                .status(PaymentStatus.INITIATED)
                .providerOrderId("PAYPAL-ORD-01")
                .providerRequestId("ORD-PAY-PAYPAL01")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        paypalPayment = paymentRepository.save(paypalPayment);

        Payment finalPaypalPayment = paypalPayment;
        PaymentCaptureResult mockResult = PaymentCaptureResult.success("MOCK-FAKE-CAPTURE", "COMPLETED");

        assertThatThrownBy(() -> paymentService.completeMockPayment(
                finalPaypalPayment,
                testBooking,
                mockResult,
                Instant.now()
        ))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("MOCK_COMPLETION_FORBIDDEN");

        // Booking MUST remain non-PAID
        Booking reloadedBooking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(reloadedBooking.getStatus()).isNotEqualTo(BookingStatus.PAID);

        // Payment MUST NOT be SUCCEEDED
        Payment reloadedPayment = paymentRepository.findById(paypalPayment.getId()).orElseThrow();
        assertThat(reloadedPayment.getStatus()).isNotEqualTo(PaymentStatus.SUCCEEDED);
    }

    @Test
    @DisplayName("Unsupported payment mode string is rejected with IllegalArgumentException")
    void testUnsupportedPaymentModeRejected() {
        assertThatThrownBy(() -> providerRegistry.getProviderByMode("UNSUPPORTED_RANDOM_PROVIDER"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported payment mode");
    }

    @Test
    @DisplayName("Idempotent double submit: Re-initiating payment with same pricing quote returns existing order")
    void testReInitiatingPaymentWithSameQuoteIsIdempotent() {
        PaymentOrderResponseDto order1 = paymentService.initiatePaymentOrder(
                bookingReference, null, null, "DEMO_CARD", userId.toString(), List.of("ROLE_USER")
        );
        PaymentOrderResponseDto order2 = paymentService.initiatePaymentOrder(
                bookingReference, null, null, "DEMO_CARD", userId.toString(), List.of("ROLE_USER")
        );

        assertThat(order1.getPaymentReference()).isEqualTo(order2.getPaymentReference());
        assertThat(order1.getProviderOrderId()).isEqualTo(order2.getProviderOrderId());
    }
}
