package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.CancellationStatusDto;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.model.*;
import com.ahmed.reservationservice.domain.payment.provider.*;
import com.ahmed.reservationservice.domain.repository.*;
import com.ahmed.reservationservice.domain.service.*;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@TestPropertySource(properties = {"spring.cloud.config.enabled=false", "eureka.client.enabled=false"})
class CancellationWorkflowIntegrationTest {
    @Autowired private CancellationService service;
    @Autowired private BookingService bookingService;
    @Autowired private BookingRepository bookings;
    @Autowired private PaymentRepository payments;
    @Autowired private OfferSnapshotRepository snapshots;
    @Autowired private CancellationRequestRepository requests;
    @Autowired private RefundRecordRepository refunds;
    @MockBean private CancellationProvider provider;
    @MockBean private PaymentProviderRegistry paymentProviders;
    @MockBean private BookingNotificationDispatcher notifications;
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private TransportsServices transportsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private UtilisateurFeign utilisateurFeign;
    private final List<UUID> bookingIds = new ArrayList<>();

    @BeforeEach
    void setup() {
        when(provider.cancel(any(), any(), any())).thenAnswer(call ->
                new CancellationProvider.Result(true, "YUDING_DEMO", "DEMO-CAN-" + call.getArgument(2), "DEMO_ONLY", "Demo accepted"));
        when(paymentProviders.getProvider("mock")).thenReturn(new MockPaymentProvider());
    }

    @AfterEach
    void cleanup() {
        for (UUID id : bookingIds) {
            refunds.findByBookingId(id).ifPresent(refunds::delete);
            requests.findByBookingId(id).ifPresent(requests::delete);
            snapshots.findByBookingId(id).ifPresent(snapshots::delete);
            payments.findByBookingIdOrderByCreatedAtDesc(id).forEach(payments::delete);
            bookings.deleteById(id);
        }
    }

    @Test
    void fullRefundIsPersistedAndRepeatedRequestHasNoSideEffects() {
        UUID owner = UUID.randomUUID();
        Booking booking = paidBooking(owner, null);
        assertThat(service.policy(booking.getBookingReference(), owner, false).refundAmount()).isEqualByComparingTo("85.00");
        CancellationStatusDto first = service.cancel(booking.getBookingReference(), "Plans changed", owner, false);
        CancellationStatusDto repeat = service.cancel(booking.getBookingReference(), "Again", owner, false);
        assertThat(first.refundStatus()).isEqualTo("REFUNDED");
        assertThat(repeat.refundStatus()).isEqualTo("REFUNDED");
        assertThat(bookings.findById(booking.getId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.REFUNDED);
        assertThat(refunds.findByBookingId(booking.getId()).orElseThrow().getAmount()).isEqualByComparingTo("85.00");
        verify(provider, times(1)).cancel(any(), any(), any());
        verify(notifications, times(1)).dispatchBookingCancelled(any(), anyString());
        verify(notifications, times(1)).dispatchRefundCompleted(any(), any(), any(), any());
        assertThat(service.status(booking.getBookingReference(), owner, false)).isPresent();
    }

    @Test
    void unpaidBookingCancelsWithoutProviderOrRefund() {
        UUID owner = UUID.randomUUID();
        Booking booking = draft(owner);
        CancellationStatusDto result = service.cancel(booking.getBookingReference(), null, owner, false);
        assertThat(result.bookingStatus()).isEqualTo("CANCELLED");
        assertThat(result.refundStatus()).isEqualTo("NOT_APPLICABLE");
        assertThat(refunds.findByBookingId(booking.getId())).isEmpty();
        verifyNoInteractions(provider, paymentProviders);
    }

    @Test
    void nonRefundableRateCancelsWithoutRefund() {
        UUID owner = UUID.randomUUID();
        Booking booking = paidBooking(owner, Map.of("selectedRoom", Map.of("refundable", false)));
        CancellationStatusDto result = service.cancel(booking.getBookingReference(), null, owner, false);
        assertThat(result.bookingStatus()).isEqualTo("CANCELLED");
        assertThat(result.refundStatus()).isEqualTo("NOT_APPLICABLE");
        assertThat(refunds.findByBookingId(booking.getId())).isEmpty();
    }

    @Test
    void trustedPartialTermsRefundOnlyPaidAmountLessFee() {
        UUID owner = UUID.randomUUID();
        Booking booking = paidBooking(owner, Map.of("cancellationPolicy",
                Map.of("type", "PARTIAL", "currency", "EUR", "fee", "15.25")));
        assertThat(service.policy(booking.getBookingReference(), owner, false).refundAmount())
                .isEqualByComparingTo("69.75");
        CancellationStatusDto result = service.cancel(booking.getBookingReference(), null, owner, false);
        assertThat(result.refundAmount()).isEqualByComparingTo("69.75");
        assertThat(result.cancellationFee()).isEqualByComparingTo("15.25");
        assertThat(result.refundStatus()).isEqualTo("REFUNDED");
        assertThat(bookings.findById(booking.getId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(refunds.findByBookingId(booking.getId()).orElseThrow().getAmount()).isEqualByComparingTo("69.75");
    }

    @Test
    void inconsistentCurrencyOrExcessFeeNeverCancels() {
        UUID owner = UUID.randomUUID();
        Booking wrongCurrency = paidBooking(owner, Map.of("cancellationPolicy",
                Map.of("type", "PARTIAL", "currency", "MAD", "fee", "5.00")));
        Booking excessFee = paidBooking(owner, Map.of("cancellationPolicy",
                Map.of("type", "PARTIAL", "currency", "EUR", "fee", "100.00")));
        for (Booking booking : List.of(wrongCurrency, excessFee)) {
            assertThat(service.policy(booking.getBookingReference(), owner, false).cancellable()).isFalse();
            assertThatThrownBy(() -> service.cancel(booking.getBookingReference(), null, owner, false))
                    .isInstanceOf(BookingConflictException.class);
            assertThat(requests.findByBookingId(booking.getId())).isEmpty();
            assertThat(refunds.findByBookingId(booking.getId())).isEmpty();
        }
        verifyNoInteractions(provider);
    }

    @Test
    void notificationFailureDoesNotUndoCommittedRefund() {
        UUID owner = UUID.randomUUID();
        Booking booking = paidBooking(owner, null);
        doThrow(new IllegalStateException("notification offline"))
                .when(notifications).dispatchBookingCancelled(any(), anyString());
        doThrow(new IllegalStateException("notification offline"))
                .when(notifications).dispatchRefundCompleted(any(), any(), any(), any());
        CancellationStatusDto result = service.cancel(booking.getBookingReference(), null, owner, false);
        assertThat(result.refundStatus()).isEqualTo("REFUNDED");
        assertThat(bookings.findById(booking.getId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.REFUNDED);
        assertThat(refunds.findByBookingId(booking.getId())).isPresent();
    }

    @Test
    void missingOrExpiredBookingCannotCreateCancellation() {
        UUID owner = UUID.randomUUID();
        assertThatThrownBy(() -> service.cancel("YUD-ABCDEFGH", null, owner, false))
                .isInstanceOf(BookingNotFoundException.class);
        Booking expired = draft(owner);
        expired.transitionTo(BookingStatus.EXPIRED, Instant.now());
        bookings.saveAndFlush(expired);
        assertThatThrownBy(() -> service.cancel(expired.getBookingReference(), null, owner, false))
                .isInstanceOf(BookingConflictException.class);
        assertThat(requests.findByBookingId(expired.getId())).isEmpty();
    }

    @Test
    void providerFailureLeavesBookingPaidAndRefundUntouched() {
        UUID owner = UUID.randomUUID();
        Booking booking = paidBooking(owner, null);
        when(provider.cancel(any(), any(), any())).thenReturn(
                new CancellationProvider.Result(false, "YUDING_DEMO", null, "FAILED", "Demo provider unavailable"));
        CancellationStatusDto result = service.cancel(booking.getBookingReference(), null, owner, false);
        assertThat(result.cancellationStatus()).isEqualTo("PROVIDER_FAILED");
        assertThat(bookings.findById(booking.getId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.PAID);
        assertThat(refunds.findByBookingId(booking.getId())).isEmpty();
        verify(notifications, never()).dispatchBookingCancelled(any(), anyString());
    }

    @Test
    void refundFailureDoesNotUndoCancellation() {
        UUID owner = UUID.randomUUID();
        Booking booking = paidBooking(owner, null);
        PaymentProvider failing = mock(PaymentProvider.class);
        when(failing.refundPayment(any())).thenReturn(PaymentRefundResult.failure("sandbox unavailable"));
        when(paymentProviders.getProvider("mock")).thenReturn(failing);
        CancellationStatusDto result = service.cancel(booking.getBookingReference(), null, owner, false);
        assertThat(result.cancellationStatus()).isEqualTo("CANCELLED");
        assertThat(result.refundStatus()).isEqualTo("REFUND_FAILED");
        assertThat(bookings.findById(booking.getId()).orElseThrow().getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(refunds.findByBookingId(booking.getId()).orElseThrow().getStatus()).isEqualTo("FAILED");
        verify(notifications, never()).dispatchRefundCompleted(any(), any(), any(), any());
    }

    @Test
    void ownershipProtectsPolicyStatusAndCancellation() {
        UUID owner = UUID.randomUUID();
        UUID stranger = UUID.randomUUID();
        Booking booking = paidBooking(owner, null);
        assertThatThrownBy(() -> service.policy(booking.getBookingReference(), stranger, false))
                .isInstanceOf(BookingOwnershipException.class);
        assertThatThrownBy(() -> service.status(booking.getBookingReference(), stranger, false))
                .isInstanceOf(BookingOwnershipException.class);
        assertThatThrownBy(() -> service.cancel(booking.getBookingReference(), null, stranger, false))
                .isInstanceOf(BookingOwnershipException.class);
        assertThat(requests.findByBookingId(booking.getId())).isEmpty();
    }

    @Test
    void concurrentRequestsProduceOneProviderCallAndOneRefund() throws Exception {
        UUID owner = UUID.randomUUID();
        Booking booking = paidBooking(owner, null);
        CountDownLatch called = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        when(provider.cancel(any(), any(), any())).thenAnswer(call -> {
            called.countDown();
            assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
            return new CancellationProvider.Result(true, "YUDING_DEMO", "DEMO-CAN", "DEMO_ONLY", "Demo accepted");
        });
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<CancellationStatusDto> first = executor.submit(() -> service.cancel(booking.getBookingReference(), null, owner, false));
            assertThat(called.await(5, TimeUnit.SECONDS)).isTrue();
            Future<CancellationStatusDto> second = executor.submit(() -> service.cancel(booking.getBookingReference(), null, owner, false));
            assertThat(second.get(5, TimeUnit.SECONDS).cancellationStatus()).isEqualTo("PROCESSING");
            release.countDown();
            assertThat(first.get(5, TimeUnit.SECONDS).refundStatus()).isEqualTo("REFUNDED");
            verify(provider, times(1)).cancel(any(), any(), any());
            assertThat(refunds.findByBookingId(booking.getId())).isPresent();
        } finally { release.countDown(); executor.shutdownNow(); }
    }

    private Booking draft(UUID owner) {
        Booking booking = bookingService.createDraft(owner, ProductType.HOTEL);
        bookingIds.add(booking.getId());
        return booking;
    }

    private Booking paidBooking(UUID owner, Map<String, Object> details) {
        Booking booking = draft(owner);
        if (details != null) {
            OfferSnapshot snapshot = OfferSnapshot.builder().booking(booking).productType(ProductType.HOTEL)
                    .provider("NUITEE").providerOfferId("DEMO-RATE").selectedDetails(details)
                    .providerAmount(new BigDecimal("85.00")).providerCurrency("EUR")
                    .capturedAt(Instant.now()).snapshotExpiresAt(Instant.now().plusSeconds(3600))
                    .snapshotHash(UUID.randomUUID().toString().replace("-", "")
                            + UUID.randomUUID().toString().replace("-", "")).build();
            snapshots.saveAndFlush(snapshot);
        }
        bookingService.markPendingPayment(booking.getId(), owner, false);
        bookingService.markPaid(booking.getId());
        Payment payment = Payment.builder().bookingId(booking.getId())
                .paymentReference("PAY-" + UUID.randomUUID().toString().substring(0, 8))
                .providerName("mock").providerTransactionId("MOCK-CAPTURE-" + UUID.randomUUID())
                .amount(new BigDecimal("85.00")).currency("EUR").status(PaymentStatus.SUCCEEDED).build();
        payments.saveAndFlush(payment);
        return booking;
    }
}
