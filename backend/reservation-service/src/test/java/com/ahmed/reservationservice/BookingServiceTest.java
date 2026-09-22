package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.config.BookingLifecycleProperties;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingTransitionException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.service.BookingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test suite for BookingService domain lifecycle commands, ownership security, and time-injected expiration.
 */
@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    private BookingLifecycleProperties properties;
    private BookingService bookingService;
    private Instant fixedInstant;

    @BeforeEach
    void setUp() {
        properties = new BookingLifecycleProperties();
        properties.setDraftTtlMinutes(30);
        properties.setPendingPaymentTtlMinutes(15);

        fixedInstant = Instant.parse("2026-09-22T12:00:00Z");
        Clock fixedClock = Clock.fixed(fixedInstant, ZoneOffset.UTC);

        bookingService = new BookingService(bookingRepository, properties);
        bookingService.setClock(fixedClock);

        lenient().when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("createDraft: creates a booking in DRAFT status with 30m TTL and UTC timestamps")
    void createDraft_success() {
        UUID userId = UUID.randomUUID();
        Booking draft = bookingService.createDraft(userId, ProductType.FLIGHT);

        assertThat(draft.getUserId()).isEqualTo(userId);
        assertThat(draft.getProductType()).isEqualTo(ProductType.FLIGHT);
        assertThat(draft.getStatus()).isEqualTo(BookingStatus.DRAFT);
        assertThat(draft.getCreatedAt()).isEqualTo(fixedInstant);
        assertThat(draft.getUpdatedAt()).isEqualTo(fixedInstant);
        assertThat(draft.getStatusChangedAt()).isEqualTo(fixedInstant);
        assertThat(draft.getExpiresAt()).isEqualTo(fixedInstant.plus(Duration.ofMinutes(30)));
        assertThat(draft.getVersion()).isZero();

        verify(bookingRepository).saveAndFlush(any(Booking.class));
    }

    @Test
    @DisplayName("markPendingPayment: transitions DRAFT to PENDING_PAYMENT and refreshes expiresAt to 15m TTL")
    void markPendingPayment_success() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        Booking updated = bookingService.markPendingPayment(bookingId, userId, false);

        assertThat(updated.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(updated.getExpiresAt()).isEqualTo(fixedInstant.plus(Duration.ofMinutes(15)));
    }

    @Test
    @DisplayName("markPaymentFailed: transitions PENDING_PAYMENT to PAYMENT_FAILED")
    void markPaymentFailed_success() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.TRAIN, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, fixedInstant);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        Booking updated = bookingService.markPaymentFailed(bookingId);

        assertThat(updated.getStatus()).isEqualTo(BookingStatus.PAYMENT_FAILED);
        assertThat(updated.getExpiresAt()).isEqualTo(fixedInstant.plus(Duration.ofMinutes(15)));
    }

    @Test
    @DisplayName("markPaid: transitions PENDING_PAYMENT to PAID and clears expiresAt (paid bookings do not expire)")
    void markPaid_success() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.ACTIVITY, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, fixedInstant);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        Booking updated = bookingService.markPaid(bookingId);

        assertThat(updated.getStatus()).isEqualTo(BookingStatus.PAID);
        assertThat(updated.getExpiresAt()).isNull();
    }

    @Test
    @DisplayName("markPendingProviderConfirmation and confirm: transitions PAID -> PENDING_PROVIDER_CONFIRMATION -> CONFIRMED")
    void fullConfirmationPath_success() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.TRANSFER, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, fixedInstant);
        booking.transitionTo(BookingStatus.PAID, fixedInstant);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        Booking pendingProvider = bookingService.markPendingProviderConfirmation(bookingId);
        assertThat(pendingProvider.getStatus()).isEqualTo(BookingStatus.PENDING_PROVIDER_CONFIRMATION);

        Booking confirmed = bookingService.confirm(bookingId);
        assertThat(confirmed.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(confirmed.getExpiresAt()).isNull();
    }

    @Test
    @DisplayName("cancel: cancels a CONFIRMED booking")
    void cancel_confirmedBooking_success() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, fixedInstant, null);
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, fixedInstant);
        booking.transitionTo(BookingStatus.PAID, fixedInstant);
        booking.transitionTo(BookingStatus.PENDING_PROVIDER_CONFIRMATION, fixedInstant);
        booking.transitionTo(BookingStatus.CONFIRMED, fixedInstant);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        Booking cancelled = bookingService.cancel(bookingId, userId, false);
        assertThat(cancelled.getStatus()).isEqualTo(BookingStatus.CANCELLED);
    }

    @Test
    @DisplayName("refund: transitions CANCELLED to REFUNDED")
    void refund_cancelledBooking_success() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, fixedInstant, null);
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, fixedInstant);
        booking.transitionTo(BookingStatus.PAID, fixedInstant);
        booking.transitionTo(BookingStatus.PENDING_PROVIDER_CONFIRMATION, fixedInstant);
        booking.transitionTo(BookingStatus.CONFIRMED, fixedInstant);
        booking.transitionTo(BookingStatus.CANCELLED, fixedInstant);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        Booking refunded = bookingService.refund(bookingId);
        assertThat(refunded.getStatus()).isEqualTo(BookingStatus.REFUNDED);
    }

    @Test
    @DisplayName("Forbidden direct transition: DRAFT cannot transition directly to CONFIRMED")
    void illegalTransition_throwsException() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.confirm(bookingId))
                .isInstanceOf(InvalidBookingTransitionException.class);
    }

    @Test
    @DisplayName("Ownership enforcement: User B cannot access User A's booking (BookingOwnershipException)")
    void ownershipViolation_throwsException() {
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();

        Booking booking = Booking.createDraft(ownerId, ProductType.FLIGHT, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.getBooking(bookingId, otherUserId, false))
                .isInstanceOf(BookingOwnershipException.class)
                .hasMessageContaining(otherUserId.toString())
                .hasMessageContaining(bookingId.toString());
    }

    @Test
    @DisplayName("Privileged access: Admin/Support can access User A's booking")
    void privilegedAccess_canAccessAnyBooking() {
        UUID ownerId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();

        Booking booking = Booking.createDraft(ownerId, ProductType.FLIGHT, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        Booking retrieved = bookingService.getBooking(bookingId, adminId, true);
        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getUserId()).isEqualTo(ownerId);
    }

    @Test
    @DisplayName("Lazy expiration: getBooking automatically transitions expired DRAFT to EXPIRED")
    void lazyExpiration_evaluatesCorrectly() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Instant expiresAt = fixedInstant.plus(Duration.ofMinutes(30));
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, fixedInstant, expiresAt);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        // Advance clock past expiration (35 minutes later)
        Instant later = fixedInstant.plus(Duration.ofMinutes(35));
        bookingService.setClock(Clock.fixed(later, ZoneOffset.UTC));

        Booking retrieved = bookingService.getBooking(bookingId, userId, false);

        assertThat(retrieved.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(retrieved.getStatusChangedAt()).isEqualTo(later);
    }

    @Test
    @DisplayName("Non-expiring state: CONFIRMED booking is never auto-expired even after time passes")
    void confirmedBooking_neverAutoExpires() {
        UUID userId = UUID.randomUUID();
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, fixedInstant);
        booking.transitionTo(BookingStatus.PAID, fixedInstant);
        booking.transitionTo(BookingStatus.PENDING_PROVIDER_CONFIRMATION, fixedInstant);
        booking.transitionTo(BookingStatus.CONFIRMED, fixedInstant);

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));

        // Advance clock by days
        Instant daysLater = fixedInstant.plus(Duration.ofDays(10));
        bookingService.setClock(Clock.fixed(daysLater, ZoneOffset.UTC));

        Booking retrieved = bookingService.getBooking(bookingId, userId, false);
        assertThat(retrieved.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
    }

    @Test
    @DisplayName("Optimistic lock conflict: ObjectOptimisticLockingFailureException maps to BookingConflictException")
    void optimisticLockConflict_mappedSafely() {
        UUID userId = UUID.randomUUID();
        when(bookingRepository.saveAndFlush(any(Booking.class)))
                .thenThrow(new ObjectOptimisticLockingFailureException(Booking.class, UUID.randomUUID()));

        assertThatThrownBy(() -> bookingService.createDraft(userId, ProductType.HOTEL))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("modified by another transaction");
    }

    @Test
    @DisplayName("BookingNotFoundException when booking does not exist")
    void bookingNotFound_throwsException() {
        UUID bookingId = UUID.randomUUID();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.getBooking(bookingId, UUID.randomUUID(), false))
                .isInstanceOf(BookingNotFoundException.class);
    }
}
