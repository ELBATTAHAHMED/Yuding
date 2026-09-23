package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.config.BookingLifecycleProperties;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.service.BookingNotificationDispatcher;
import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.ahmed.reservationservice.domain.service.OfferSnapshotFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * CRITICAL TRUTH TEST:
 * Validates that BOOKING_CONFIRMED fires ONLY when Booking status reaches CONFIRMED.
 * Specifically proves that PAID emits ZERO confirmed emails.
 */
@ExtendWith(MockitoExtension.class)
class BookingNotificationTruthTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingReferenceGenerator referenceGenerator;

    @Mock
    private OfferSnapshotRepository offerSnapshotRepository;

    @Mock
    private OfferSnapshotFactory offerSnapshotFactory;

    @Mock
    private BookingNotificationDispatcher notificationDispatcher;

    private BookingService bookingService;
    private UUID bookingId;
    private String bookingRef;
    private UUID userId;

    @BeforeEach
    void setUp() {
        BookingLifecycleProperties properties = new BookingLifecycleProperties();
        properties.setDraftTtlMinutes(30);
        properties.setPendingPaymentTtlMinutes(15);

        bookingService = new BookingService(
                bookingRepository,
                referenceGenerator,
                properties,
                offerSnapshotRepository,
                offerSnapshotFactory,
                null,
                notificationDispatcher
        );

        bookingId = UUID.randomUUID();
        bookingRef = "YUD-K7M4P2Q8";
        userId = UUID.randomUUID();
    }

    @Test
    @DisplayName("TRUTH RULE: markPaid() MUST emit ZERO confirmed emails")
    void markPaid_mustNotEmitBookingConfirmedEmail() {
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, Instant.now());
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Booking result = bookingService.markPaid(bookingId);

        assertThat(result.getStatus()).isEqualTo(BookingStatus.PAID);
        // CRITICAL: ZERO confirmed emails on markPaid!
        verify(notificationDispatcher, never()).dispatchBookingConfirmed(any());
    }

    @Test
    @DisplayName("TRUTH RULE: confirm() MUST emit exactly 1 BOOKING_CONFIRMED email")
    void confirm_mustEmitBookingConfirmedEmail() {
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, Instant.now());
        booking.transitionTo(BookingStatus.PAID, Instant.now());
        booking.transitionTo(BookingStatus.PENDING_PROVIDER_CONFIRMATION, Instant.now());
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Booking result = bookingService.confirm(bookingId);

        assertThat(result.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        // CRITICAL: Exactly 1 confirmed email on confirm!
        verify(notificationDispatcher, times(1)).dispatchBookingConfirmed(argThat(b ->
                b.getBookingReference().equals(bookingRef) && b.getStatus() == BookingStatus.CONFIRMED
        ));
    }

    @Test
    @DisplayName("cancelByReference() MUST emit BOOKING_CANCELLED email")
    void cancelByReference_mustEmitCancelledEmail() {
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Booking result = bookingService.cancelByReference(bookingRef, userId, false);

        assertThat(result.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(notificationDispatcher, times(1)).dispatchBookingCancelled(argThat(b ->
                b.getBookingReference().equals(bookingRef)
        ));
    }

    @Test
    @DisplayName("refund() MUST emit REFUND_COMPLETED email")
    void refund_mustEmitRefundCompletedEmail() {
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, Instant.now());
        booking.transitionTo(BookingStatus.PAID, Instant.now());
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Booking result = bookingService.refund(bookingId);

        assertThat(result.getStatus()).isEqualTo(BookingStatus.REFUNDED);
        verify(notificationDispatcher, times(1)).dispatchRefundCompleted(argThat(b ->
                b.getBookingReference().equals(bookingRef)
        ), any(), any(), eq("EUR"));
    }

    @Test
    @DisplayName("markPaymentFailed() MUST emit PAYMENT_FAILED email")
    void markPaymentFailed_mustEmitPaymentFailedEmail() {
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRef, Instant.now(), Instant.now().plusSeconds(1800));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, Instant.now());
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Booking result = bookingService.markPaymentFailed(bookingId);

        assertThat(result.getStatus()).isEqualTo(BookingStatus.PAYMENT_FAILED);
        verify(notificationDispatcher, times(1)).dispatchPaymentFailed(argThat(b ->
                b.getBookingReference().equals(bookingRef)
        ), any(), any(), eq("EUR"));
    }
}
