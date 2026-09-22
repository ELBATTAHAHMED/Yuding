package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.config.BookingLifecycleProperties;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingReferenceException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingTransitionException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test suite for BookingService domain lifecycle commands, public reference allocation,
 * collision retry handling, and time-injected expiration.
 */
@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingReferenceGenerator referenceGenerator;

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

        bookingService = new BookingService(bookingRepository, referenceGenerator, properties);
        bookingService.setClock(fixedClock);

        lenient().when(referenceGenerator.generate()).thenReturn("YUD-K7M4P2Q8");
        lenient().when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("createDraft: creates a booking with YUD-XXXXXXXX reference, 30m TTL and UTC timestamps")
    void createDraft_success() {
        UUID userId = UUID.randomUUID();
        when(bookingRepository.existsByBookingReference("YUD-K7M4P2Q8")).thenReturn(false);

        Booking draft = bookingService.createDraft(userId, ProductType.FLIGHT);

        assertThat(draft.getBookingReference()).isEqualTo("YUD-K7M4P2Q8");
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
    @DisplayName("Collision retry: retries reference generation when first candidate collides")
    void createDraft_collisionRetry_success() {
        UUID userId = UUID.randomUUID();
        when(referenceGenerator.generate())
                .thenReturn("YUD-DUPL2345")
                .thenReturn("YUD-SUCC2345");

        when(bookingRepository.existsByBookingReference("YUD-DUPL2345")).thenReturn(true);
        when(bookingRepository.existsByBookingReference("YUD-SUCC2345")).thenReturn(false);

        Booking draft = bookingService.createDraft(userId, ProductType.HOTEL);

        assertThat(draft.getBookingReference()).isEqualTo("YUD-SUCC2345");
        verify(referenceGenerator, times(2)).generate();
    }

    @Test
    @DisplayName("Collision exhaustion: throws BookingConflictException when retry limit (5) is reached")
    void createDraft_collisionExhaustion_throwsConflict() {
        UUID userId = UUID.randomUUID();
        when(referenceGenerator.generate()).thenReturn("YUD-DUPL2345");
        when(bookingRepository.existsByBookingReference("YUD-DUPL2345")).thenReturn(true);

        assertThatThrownBy(() -> bookingService.createDraft(userId, ProductType.TRAIN))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("Unable to allocate a unique booking reference");

        verify(referenceGenerator, times(5)).generate();
    }

    @Test
    @DisplayName("getBookingByReference: retrieves booking by public reference for owner")
    void getBookingByReference_success() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));

        Booking result = bookingService.getBookingByReference(ref, userId, false);
        assertThat(result.getBookingReference()).isEqualTo(ref);
        assertThat(result.getUserId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("getBookingByReference: rejects malformed reference format with InvalidBookingReferenceException")
    void getBookingByReference_malformedFormat_throwsException() {
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> bookingService.getBookingByReference("invalid-reference", userId, false))
                .isInstanceOf(InvalidBookingReferenceException.class);
    }

    @Test
    @DisplayName("getBookingByReference: enforces ownership against non-owner (BookingOwnershipException)")
    void getBookingByReference_ownershipViolation_throwsException() {
        UUID ownerId = UUID.randomUUID();
        UUID otherUserId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Booking booking = Booking.createDraft(ownerId, ProductType.FLIGHT, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.getBookingByReference(ref, otherUserId, false))
                .isInstanceOf(BookingOwnershipException.class);
    }

    @Test
    @DisplayName("cancelByReference: cancels a booking using its public reference")
    void cancelByReference_success() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Booking booking = Booking.createDraft(userId, ProductType.ACTIVITY, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));

        Booking cancelled = bookingService.cancelByReference(ref, userId, false);
        assertThat(cancelled.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(cancelled.getBookingReference()).isEqualTo(ref); // Reference preserved
    }

    @Test
    @DisplayName("Reference Immutability: reference remains identical across the entire lifecycle")
    void referenceImmutability_preservedAcrossTransitions() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, ref, fixedInstant, null);

        assertThat(booking.getBookingReference()).isEqualTo(ref);

        booking.transitionTo(BookingStatus.PENDING_PAYMENT, fixedInstant);
        assertThat(booking.getBookingReference()).isEqualTo(ref);

        booking.transitionTo(BookingStatus.PAID, fixedInstant);
        assertThat(booking.getBookingReference()).isEqualTo(ref);

        booking.transitionTo(BookingStatus.PENDING_PROVIDER_CONFIRMATION, fixedInstant);
        assertThat(booking.getBookingReference()).isEqualTo(ref);

        booking.transitionTo(BookingStatus.CONFIRMED, fixedInstant);
        assertThat(booking.getBookingReference()).isEqualTo(ref);

        booking.transitionTo(BookingStatus.CANCELLED, fixedInstant);
        assertThat(booking.getBookingReference()).isEqualTo(ref);

        booking.transitionTo(BookingStatus.REFUNDED, fixedInstant);
        assertThat(booking.getBookingReference()).isEqualTo(ref);
    }

    @Test
    @DisplayName("Lazy expiration: getBookingByReference transitions expired DRAFT to EXPIRED")
    void lazyExpiration_byReference_evaluatesCorrectly() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Instant expiresAt = fixedInstant.plus(Duration.ofMinutes(30));
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, ref, fixedInstant, expiresAt);

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));

        // Advance clock past expiration (35 minutes later)
        Instant later = fixedInstant.plus(Duration.ofMinutes(35));
        bookingService.setClock(Clock.fixed(later, ZoneOffset.UTC));

        Booking retrieved = bookingService.getBookingByReference(ref, userId, false);

        assertThat(retrieved.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(retrieved.getBookingReference()).isEqualTo(ref);
    }

    @Test
    @DisplayName("Optimistic lock conflict: ObjectOptimisticLockingFailureException maps to BookingConflictException")
    void optimisticLockConflict_mappedSafely() {
        UUID userId = UUID.randomUUID();
        when(bookingRepository.existsByBookingReference(any())).thenReturn(false);
        when(bookingRepository.saveAndFlush(any(Booking.class)))
                .thenThrow(new ObjectOptimisticLockingFailureException(Booking.class, UUID.randomUUID()));

        assertThatThrownBy(() -> bookingService.createDraft(userId, ProductType.HOTEL))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("modified by another transaction");
    }
}
