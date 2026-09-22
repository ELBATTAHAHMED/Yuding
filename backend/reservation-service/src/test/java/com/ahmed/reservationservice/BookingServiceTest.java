package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.config.BookingLifecycleProperties;
import com.ahmed.reservationservice.domain.dto.ResolvedOfferDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingReferenceException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingTransitionException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.ahmed.reservationservice.domain.service.OfferSnapshotFactory;
import com.ahmed.reservationservice.feign.TravelOfferResolverClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
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
 * offer snapshots, and time-injected expiration.
 */
@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingReferenceGenerator referenceGenerator;

    @Mock
    private OfferSnapshotRepository offerSnapshotRepository;

    @Mock
    private OfferSnapshotFactory offerSnapshotFactory;

    @Mock
    private TravelOfferResolverClient travelOfferResolverClient;

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

        bookingService = new BookingService(
                bookingRepository,
                referenceGenerator,
                properties,
                offerSnapshotRepository,
                offerSnapshotFactory,
                travelOfferResolverClient
        );
        bookingService.setClock(fixedClock);

        lenient().when(referenceGenerator.generate()).thenReturn("YUD-K7M4P2Q8");
        lenient().when(bookingRepository.saveAndFlush(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(offerSnapshotRepository.saveAndFlush(any(OfferSnapshot.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("createDraft: creates a booking with YUD-XXXXXXXX reference, 30m TTL and UTC timestamps")
    void createDraft_success() {
        UUID userId = UUID.randomUUID();
        when(bookingRepository.existsByBookingReference("YUD-K7M4P2Q8")).thenReturn(false);

        Booking draft = bookingService.createDraft(userId, ProductType.FLIGHT);

        assertThat(draft).isNotNull();
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
        assertThatThrownBy(() -> bookingService.getBookingByReference("malformed-ref", userId, false))
                .isInstanceOf(InvalidBookingReferenceException.class)
                .hasMessageContaining("malformed-ref");
    }

    @Test
    @DisplayName("getBookingByReference: throws BookingOwnershipException when unauthorized user accesses booking")
    void getBookingByReference_unauthorizedUser_throwsOwnershipException() {
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Booking booking = Booking.createDraft(ownerId, ProductType.HOTEL, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.getBookingByReference(ref, attackerId, false))
                .isInstanceOf(BookingOwnershipException.class);
    }

    @Test
    @DisplayName("getBookingByReference: allows privileged admin access regardless of ownership")
    void getBookingByReference_adminAccess_success() {
        UUID ownerId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Booking booking = Booking.createDraft(ownerId, ProductType.HOTEL, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));

        Booking result = bookingService.getBookingByReference(ref, adminId, true);
        assertThat(result.getBookingReference()).isEqualTo(ref);
    }

    @Test
    @DisplayName("Lazy expiration: transitions active draft to EXPIRED when reading past expiration")
    void getBookingByReference_pastExpiration_transitionsToExpired() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Instant pastExpiresAt = fixedInstant.minus(Duration.ofMinutes(5));
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, ref, fixedInstant.minus(Duration.ofMinutes(35)), pastExpiresAt);

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));

        Booking result = bookingService.getBookingByReference(ref, userId, false);
        assertThat(result.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(result.getStatusChangedAt()).isEqualTo(fixedInstant);
        verify(bookingRepository).saveAndFlush(booking);
    }

    // ─── OFFER SNAPSHOT TESTS ────────────────────────────────────────────────

    @Test
    @DisplayName("attachOfferSnapshot: resolves trusted offer and attaches immutable snapshot to DRAFT booking")
    void attachOfferSnapshot_draftBooking_success() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        String selectionRef = "sel-flight-1";
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        ResolvedOfferDto resolved = ResolvedOfferDto.builder()
                .selectionRef(selectionRef)
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .providerOfferId("fl-1")
                .providerAmount(new BigDecimal("250.00"))
                .providerCurrency("EUR")
                .build();

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .booking(booking)
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerOfferId("fl-1")
                .providerAmount(new BigDecimal("250.00"))
                .providerCurrency("EUR")
                .snapshotHash("test-hash-123456789012345678901234567890123456789012345678901234567890")
                .capturedAt(fixedInstant)
                .snapshotExpiresAt(fixedInstant.plus(Duration.ofMinutes(15)))
                .build();

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.existsByBookingId(booking.getId())).thenReturn(false);
        when(travelOfferResolverClient.resolveOfferSelection(selectionRef)).thenReturn(Optional.of(resolved));
        when(offerSnapshotFactory.createSnapshot(booking, resolved, fixedInstant)).thenReturn(snapshot);

        OfferSnapshot attached = bookingService.attachOfferSnapshot(ref, selectionRef, userId, false);

        assertThat(attached).isNotNull();
        assertThat(attached.getProvider()).isEqualTo("SCRAPPA");
        verify(offerSnapshotRepository).saveAndFlush(snapshot);
    }

    @Test
    @DisplayName("attachOfferSnapshot: rejects duplicate snapshot on same booking with 409 Conflict")
    void attachOfferSnapshot_duplicate_throwsConflict() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.existsByBookingId(booking.getId())).thenReturn(true);

        assertThatThrownBy(() -> bookingService.attachOfferSnapshot(ref, "sel-hotel-1", userId, false))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("already has an attached offer snapshot");
    }

    @Test
    @DisplayName("attachOfferSnapshot: rejects attachment when booking is not in DRAFT status (e.g. PAID)")
    void attachOfferSnapshot_nonDraft_throwsConflict() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, fixedInstant);
        booking.transitionTo(BookingStatus.PAID, fixedInstant);

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.attachOfferSnapshot(ref, "sel-hotel-1", userId, false))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("Only DRAFT bookings are eligible");
    }

    @Test
    @DisplayName("attachOfferSnapshot: throws BookingNotFoundException when selection reference is not found/expired")
    void attachOfferSnapshot_selectionNotFound_throwsNotFound() {
        UUID userId = UUID.randomUUID();
        String ref = "YUD-K7M4P2Q8";
        String selectionRef = "sel-expired-99";
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, ref, fixedInstant, fixedInstant.plus(Duration.ofMinutes(30)));

        when(bookingRepository.findByBookingReference(ref)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.existsByBookingId(booking.getId())).thenReturn(false);
        when(travelOfferResolverClient.resolveOfferSelection(selectionRef)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.attachOfferSnapshot(ref, selectionRef, userId, false))
                .isInstanceOf(BookingNotFoundException.class)
                .hasMessageContaining("was not found or has expired");
    }
}
