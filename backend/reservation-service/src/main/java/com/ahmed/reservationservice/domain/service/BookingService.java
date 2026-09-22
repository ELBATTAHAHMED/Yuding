package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.config.BookingLifecycleProperties;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingReferenceException;
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
 * Orchestrates public reference allocation, lifecycle transitions, ownership enforcement,
 * expiration evaluation, and optimistic concurrency protection.
 */
@Service
@Slf4j
@Transactional
public class BookingService {

    private static final int MAX_REFERENCE_GENERATION_ATTEMPTS = 5;

    private final BookingRepository bookingRepository;
    private final BookingReferenceGenerator referenceGenerator;
    private final BookingLifecycleProperties properties;
    private Clock clock;

    @Autowired
    public BookingService(
            BookingRepository bookingRepository,
            BookingReferenceGenerator referenceGenerator,
            BookingLifecycleProperties properties) {
        this.bookingRepository = bookingRepository;
        this.referenceGenerator = referenceGenerator;
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
     * Creates a new DRAFT booking with a unique cryptographic public reference (YUD-XXXXXXXX).
     */
    public Booking createDraft(UUID userId, ProductType productType) {
        Instant current = now();
        Instant expiresAt = current.plus(Duration.ofMinutes(properties.getDraftTtlMinutes()));

        String reference = allocateUniqueReference();
        Booking booking = Booking.createDraft(userId, productType, reference, current, expiresAt);

        log.info("Creating DRAFT booking [{}] for user {} (product: {}, expiresAt: {})",
                reference, userId, productType, expiresAt);
        return saveWithOptimisticLockHandling(booking);
    }

    private String allocateUniqueReference() {
        for (int attempt = 1; attempt <= MAX_REFERENCE_GENERATION_ATTEMPTS; attempt++) {
            String candidate = referenceGenerator.generate();
            if (!bookingRepository.existsByBookingReference(candidate)) {
                return candidate;
            }
            log.warn("Booking reference collision detected on candidate [{}]. Retrying (attempt {}/{})",
                    candidate, attempt, MAX_REFERENCE_GENERATION_ATTEMPTS);
        }
        throw new BookingConflictException("Unable to allocate a unique booking reference. Please retry.");
    }

    /**
     * Retrieves a booking by its public reference (YUD-XXXXXXXX), enforcing ownership/privilege.
     * Evaluates expiration on read.
     */
    public Booking getBookingByReference(String bookingReference, UUID requestingUserId, boolean privileged) {
        String normalized = BookingReferenceGenerator.normalize(bookingReference);
        if (!BookingReferenceGenerator.isValid(normalized)) {
            throw new InvalidBookingReferenceException(bookingReference);
        }

        Booking booking = bookingRepository.findByBookingReference(normalized)
                .orElseThrow(() -> new BookingNotFoundException(normalized));

        if (!privileged && !booking.getUserId().equals(requestingUserId)) {
            log.warn("Security violation: user {} attempted to access booking [{}] owned by {}",
                    requestingUserId, normalized, booking.getUserId());
            throw new BookingOwnershipException(booking.getId(), requestingUserId);
        }

        // Lazy evaluation of expiration
        if (booking.isExpired(now())) {
            log.info("Booking [{}] reached natural expiration (expiresAt: {}). Transitioning to EXPIRED.",
                    normalized, booking.getExpiresAt());
            booking.transitionTo(BookingStatus.EXPIRED, now());
            booking = saveWithOptimisticLockHandling(booking);
        }

        return booking;
    }

    /**
     * Cancels a booking using its public reference.
     */
    public Booking cancelByReference(String bookingReference, UUID requestingUserId, boolean privileged) {
        Booking booking = getBookingByReference(bookingReference, requestingUserId, privileged);
        Instant current = now();

        log.info("Cancelling booking [{}] from current status {}", booking.getBookingReference(), booking.getStatus());
        booking.transitionTo(BookingStatus.CANCELLED, current);
        booking.updateExpiresAt(null, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Retrieves all bookings owned by the authenticated user.
     */
    @Transactional(readOnly = true)
    public List<Booking> getUserBookings(UUID userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Internal technical retrieval by internal database UUID.
     */
    public Booking getBooking(UUID bookingId, UUID requestingUserId, boolean privileged) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (!privileged && !booking.getUserId().equals(requestingUserId)) {
            log.warn("Security violation: user {} attempted to access booking {} owned by {}",
                    requestingUserId, bookingId, booking.getUserId());
            throw new BookingOwnershipException(bookingId, requestingUserId);
        }

        if (booking.isExpired(now())) {
            log.info("Booking {} reached natural expiration (expiresAt: {}). Transitioning to EXPIRED.",
                    bookingId, booking.getExpiresAt());
            booking.transitionTo(BookingStatus.EXPIRED, now());
            booking = saveWithOptimisticLockHandling(booking);
        }

        return booking;
    }

    /**
     * Transitions a DRAFT or PAYMENT_FAILED booking into PENDING_PAYMENT.
     */
    public Booking markPendingPayment(UUID bookingId, UUID requestingUserId, boolean privileged) {
        Booking booking = getBooking(bookingId, requestingUserId, privileged);
        Instant current = now();
        Instant expiresAt = current.plus(Duration.ofMinutes(properties.getPendingPaymentTtlMinutes()));

        log.info("Transitioning booking [{}] from {} to PENDING_PAYMENT",
                booking.getBookingReference(), booking.getStatus());
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

        log.info("Transitioning booking [{}] from {} to PAYMENT_FAILED",
                booking.getBookingReference(), booking.getStatus());
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

        log.info("Transitioning booking [{}] from {} to PAID",
                booking.getBookingReference(), booking.getStatus());
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

        log.info("Transitioning booking [{}] from {} to PENDING_PROVIDER_CONFIRMATION",
                booking.getBookingReference(), booking.getStatus());
        booking.transitionTo(BookingStatus.PENDING_PROVIDER_CONFIRMATION, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Confirms a booking (provider confirmation complete).
     */
    public Booking confirm(UUID bookingId) {
        Booking booking = findByIdOrThrow(bookingId);
        Instant current = now();

        log.info("Transitioning booking [{}] from {} to CONFIRMED",
                booking.getBookingReference(), booking.getStatus());
        booking.transitionTo(BookingStatus.CONFIRMED, current);
        booking.updateExpiresAt(null, current);
        return saveWithOptimisticLockHandling(booking);
    }

    /**
     * Cancels a booking (by internal UUID).
     */
    public Booking cancel(UUID bookingId, UUID requestingUserId, boolean privileged) {
        Booking booking = getBooking(bookingId, requestingUserId, privileged);
        Instant current = now();

        log.info("Cancelling booking [{}] from current status {}",
                booking.getBookingReference(), booking.getStatus());
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

        log.info("Transitioning booking [{}] from {} to REFUNDED",
                booking.getBookingReference(), booking.getStatus());
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

        log.info("Transitioning booking [{}] from {} to EXPIRED",
                booking.getBookingReference(), booking.getStatus());
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
            log.warn("Optimistic lock conflict on booking [{}] (ID: {})",
                    booking.getBookingReference(), booking.getId(), ex);
            throw new BookingConflictException("The booking was modified by another transaction. Please reload.", ex);
        }
    }
}
