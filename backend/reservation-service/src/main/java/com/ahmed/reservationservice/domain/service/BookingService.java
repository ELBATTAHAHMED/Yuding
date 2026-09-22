package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.config.BookingLifecycleProperties;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Server-authoritative Booking domain service.
 * Orchestrates lifecycle transitions, ownership enforcement, expiration evaluation, and concurrency protection.
 */
@Service
@Slf4j
@Transactional
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingLifecycleProperties properties;
    private Clock clock;

    @Autowired
    public BookingService(BookingRepository bookingRepository, BookingLifecycleProperties properties) {
        this.bookingRepository = bookingRepository;
        this.properties = properties;
        this.clock = Clock.systemUTC();
    }

    /**
     * Package-private setter for deterministic time injection in tests.
     */
    public void setClock(Clock clock) {
        this.clock = clock;
    }

    private Instant now() {
        return Instant.now(clock);
    }

    /**
     * Creates a new DRAFT booking for the authenticated user.
     */
    public Booking createDraft(UUID userId, ProductType productType) {
        Instant current = now();
        Instant expiresAt = current.plus(Duration.ofMinutes(properties.getDraftTtlMinutes()));

        Booking booking = Booking.createDraft(userId, productType, current, expiresAt);
        log.info("Creating DRAFT booking for user {} (product: {}, expiresAt: {})", userId, productType, expiresAt);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Retrieves a booking by ID enforcing user ownership or privileged access.
     * Evaluates expiration on read.
     */
    public Booking getBooking(UUID bookingId, UUID requestingUserId, boolean privileged) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (!privileged && !booking.getUserId().equals(requestingUserId)) {
            log.warn("Security violation: user {} attempted to access booking {} owned by {}",
                    requestingUserId, bookingId, booking.getUserId());
            throw new BookingOwnershipException(bookingId, requestingUserId);
        }

        // Lazy evaluation of expiration
        if (booking.isExpired(now())) {
            log.info("Booking {} reached natural expiration (expiresAt: {}). Transitioning to EXPIRED.",
                    bookingId, booking.getExpiresAt());
            booking.transitionTo(BookingStatus.EXPIRED, now());
            booking = saveWithOptimisticLockHandling(booking);
        }

        return booking;
    }

    /**
     * Retrieves all bookings owned by the authenticated user.
     */
    @Transactional(readOnly = true)
    public List<Booking> getUserBookings(UUID userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Transitions a DRAFT or PAYMENT_FAILED booking into PENDING_PAYMENT.
     */
    public Booking markPendingPayment(UUID bookingId, UUID requestingUserId, boolean privileged) {
        Booking booking = getBooking(bookingId, requestingUserId, privileged);
        Instant current = now();
        Instant expiresAt = current.plus(Duration.ofMinutes(properties.getPendingPaymentTtlMinutes()));

        log.info("Transitioning booking {} from {} to PENDING_PAYMENT", bookingId, booking.getStatus());
        booking.transitionTo(BookingStatus.PENDING_PAYMENT, current);
        booking.updateExpiresAt(expiresAt, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Marks a booking as PAYMENT_FAILED (domain command).
     */
    public Booking markPaymentFailed(UUID bookingId) {
        Booking booking = findByIdOrThrow(bookingId);
        Instant current = now();
        Instant expiresAt = current.plus(Duration.ofMinutes(properties.getPendingPaymentTtlMinutes()));

        log.info("Transitioning booking {} from {} to PAYMENT_FAILED", bookingId, booking.getStatus());
        booking.transitionTo(BookingStatus.PAYMENT_FAILED, current);
        booking.updateExpiresAt(expiresAt, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Marks a booking as PAID upon successful simulated payment capture.
     */
    public Booking markPaid(UUID bookingId) {
        Booking booking = findByIdOrThrow(bookingId);
        Instant current = now();

        log.info("Transitioning booking {} from {} to PAID", bookingId, booking.getStatus());
        booking.transitionTo(BookingStatus.PAID, current);
        booking.updateExpiresAt(null, current); // Paid bookings do not auto-expire
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Marks a booking as PENDING_PROVIDER_CONFIRMATION.
     */
    public Booking markPendingProviderConfirmation(UUID bookingId) {
        Booking booking = findByIdOrThrow(bookingId);
        Instant current = now();

        log.info("Transitioning booking {} from {} to PENDING_PROVIDER_CONFIRMATION", bookingId, booking.getStatus());
        booking.transitionTo(BookingStatus.PENDING_PROVIDER_CONFIRMATION, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Confirms a booking (provider confirmation complete).
     */
    public Booking confirm(UUID bookingId) {
        Booking booking = findByIdOrThrow(bookingId);
        Instant current = now();

        log.info("Transitioning booking {} from {} to CONFIRMED", bookingId, booking.getStatus());
        booking.transitionTo(BookingStatus.CONFIRMED, current);
        booking.updateExpiresAt(null, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Cancels a booking (from DRAFT, PENDING_PAYMENT, PAYMENT_FAILED, or CONFIRMED).
     */
    public Booking cancel(UUID bookingId, UUID requestingUserId, boolean privileged) {
        Booking booking = getBooking(bookingId, requestingUserId, privileged);
        Instant current = now();

        log.info("Cancelling booking {} from current status {}", bookingId, booking.getStatus());
        booking.transitionTo(BookingStatus.CANCELLED, current);
        booking.updateExpiresAt(null, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Refunds a booking (from PAID, PENDING_PROVIDER_CONFIRMATION, or CANCELLED).
     */
    public Booking refund(UUID bookingId) {
        Booking booking = findByIdOrThrow(bookingId);
        Instant current = now();

        log.info("Transitioning booking {} from {} to REFUNDED", bookingId, booking.getStatus());
        booking.transitionTo(BookingStatus.REFUNDED, current);
        booking.updateExpiresAt(null, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Expires a booking (from DRAFT, PENDING_PAYMENT, or PAYMENT_FAILED).
     */
    public Booking expire(UUID bookingId) {
        Booking booking = findByIdOrThrow(bookingId);
        Instant current = now();

        log.info("Transitioning booking {} from {} to EXPIRED", bookingId, booking.getStatus());
        booking.transitionTo(BookingStatus.EXPIRED, current);
        return saveWithOptimisticLockHandling(booking);
    }

    private Booking findByIdOrThrow(UUID bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));
    }

    private Booking saveWithOptimisticLockHandling(Booking booking) {
        try {
            return bookingRepository.saveAndFlush(booking);
        } catch (ObjectOptimisticLockingFailureException ex) {
            log.warn("Optimistic lock conflict on booking ID {}", booking.getId(), ex);
            throw new BookingConflictException("The booking was modified by another transaction. Please reload.", ex);
        }
    }
}
