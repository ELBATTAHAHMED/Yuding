package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.PaymentCaptureRequestDto;
import com.ahmed.reservationservice.domain.dto.PaymentCaptureResponseDto;
import com.ahmed.reservationservice.domain.dto.PaymentOrderResponseDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import com.ahmed.reservationservice.domain.payment.provider.MockPaymentProvider;
import com.ahmed.reservationservice.domain.payment.provider.PaymentProviderRegistry;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import com.ahmed.reservationservice.domain.service.BookingPricingReadinessPolicy;
import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.ahmed.reservationservice.domain.service.PaymentReferenceGenerator;
import com.ahmed.reservationservice.domain.service.PaymentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentService Tests")
class PaymentServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingService bookingService;

    @Mock
    private ServerPricingQuoteRepository serverPricingQuoteRepository;

    @Mock
    private OfferRevalidationRepository offerRevalidationRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private PaymentProviderRegistry providerRegistry;

    private PaymentReferenceGenerator paymentReferenceGenerator;
    private BookingPricingReadinessPolicy pricingReadinessPolicy;
    private PaymentService paymentService;

    private final UUID userId = UUID.randomUUID();
    private final UUID bookingId = UUID.randomUUID();
    private String bookingRef;

    @BeforeEach
    void setUp() {
        BookingReferenceGenerator bookingReferenceGenerator = new BookingReferenceGenerator();
        bookingRef = bookingReferenceGenerator.generate();
        paymentReferenceGenerator = new PaymentReferenceGenerator();
        pricingReadinessPolicy = new BookingPricingReadinessPolicy();
        paymentService = new PaymentService(
                bookingRepository,
                bookingService,
                serverPricingQuoteRepository,
                offerRevalidationRepository,
                paymentRepository,
                providerRegistry,
                paymentReferenceGenerator,
                pricingReadinessPolicy
        );
    }

    @Test
    @DisplayName("Should successfully initiate payment order and transition booking to PENDING_PAYMENT")
    void shouldInitiatePaymentOrder() {
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        ServerPricingQuote quote = ServerPricingQuote.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .pricingStatus(PricingStatus.PRICED)
                .totalAmount(new BigDecimal("99.99"))
                .currency("EUR")
                .validUntil(Instant.now().plusSeconds(600))
                .build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .validUntil(Instant.now().plusSeconds(600))
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(serverPricingQuoteRepository.findTopByBookingIdOrderByPricedAtDesc(any())).thenReturn(Optional.of(quote));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(any())).thenReturn(Optional.of(reval));
        when(providerRegistry.getActiveProvider()).thenReturn(new MockPaymentProvider());
        when(bookingService.markPendingPayment(any(), any(), any(Boolean.class))).thenReturn(booking);
        when(paymentRepository.existsByPaymentReference(any())).thenReturn(false);
        when(paymentRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentOrderResponseDto response = paymentService.initiatePaymentOrder(
                bookingRef, null, null, userId.toString(), List.of("ROLE_USER"));

        assertThat(response).isNotNull();
        assertThat(response.getBookingReference()).isEqualTo(bookingRef);
        assertThat(response.getPaymentReference()).startsWith("PAY-");
        assertThat(response.getAmount()).isEqualByComparingTo(new BigDecimal("99.99"));
        assertThat(response.getCurrency()).isEqualTo("EUR");
        assertThat(response.getProviderOrderId()).startsWith("MOCK-ORDER-");

        verify(bookingService).markPendingPayment(eq(booking.getId()), eq(userId), eq(false));
    }

    @Test
    @DisplayName("Should reject payment initiation for unpriced booking")
    void shouldRejectUnpricedBooking() {
        Booking booking = Booking.createDraft(userId, ProductType.TRAIN, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        ServerPricingQuote quote = ServerPricingQuote.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .pricingStatus(PricingStatus.NOT_APPLICABLE)
                .validUntil(Instant.now().plusSeconds(600))
                .build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .validUntil(Instant.now().plusSeconds(600))
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(serverPricingQuoteRepository.findTopByBookingIdOrderByPricedAtDesc(any())).thenReturn(Optional.of(quote));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(any())).thenReturn(Optional.of(reval));

        assertThatThrownBy(() -> paymentService.initiatePaymentOrder(
                bookingRef, null, null, userId.toString(), List.of("ROLE_USER")))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("CANNOT_PAY_UNPRICED");
    }

    @Test
    @DisplayName("Should enforce IDOR ownership validation on payment order initiation")
    void shouldEnforceOwnershipOnInitiate() {
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));

        UUID differentUser = UUID.randomUUID();
        assertThatThrownBy(() -> paymentService.initiatePaymentOrder(
                bookingRef, null, null, differentUser.toString(), List.of("ROLE_USER")))
                .isInstanceOf(BookingOwnershipException.class);
    }

    @Test
    @DisplayName("Should successfully capture payment and transition booking to PAID")
    void shouldCapturePayment() {
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        Payment payment = Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(booking.getId())
                .paymentReference("PAY-ABC12345")
                .providerName("mock")
                .providerOrderId("MOCK-ORDER-1234")
                .amount(new BigDecimal("99.99"))
                .currency("EUR")
                .status(PaymentStatus.INITIATED)
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(paymentRepository.findByPaymentReference("PAY-ABC12345")).thenReturn(Optional.of(payment));
        when(providerRegistry.getProvider("mock")).thenReturn(new MockPaymentProvider());

        PaymentCaptureRequestDto request = PaymentCaptureRequestDto.builder()
                .paymentReference("PAY-ABC12345")
                .build();

        PaymentCaptureResponseDto response = paymentService.capturePayment(
                bookingRef, request, userId.toString(), List.of("ROLE_USER"));

        assertThat(response).isNotNull();
        assertThat(response.getPaymentStatus()).isEqualTo("AWAITING_WEBHOOK");
        assertThat(response.getProviderTransactionId()).startsWith("MOCK-CAPTURE-");
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.AWAITING_WEBHOOK);

        verify(bookingService, org.mockito.Mockito.never()).markPaid(any());
    }
}
