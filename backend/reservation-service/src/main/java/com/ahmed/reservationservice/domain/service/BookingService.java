package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.config.BookingLifecycleProperties;
import com.ahmed.reservationservice.domain.dto.ResolvedOfferDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingReferenceException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.feign.TravelOfferResolverClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Server-authoritative Booking domain service.
 * Orchestrates public reference allocation, lifecycle transitions, immutable offer snapshots,
 * ownership enforcement, expiration evaluation, and optimistic concurrency protection.
 */
@Service
@Slf4j
@Transactional
public class BookingService {

    private static final int MAX_REFERENCE_GENERATION_ATTEMPTS = 5;

    private final BookingRepository bookingRepository;
    private final BookingReferenceGenerator referenceGenerator;
    private final BookingLifecycleProperties properties;
    private final OfferSnapshotRepository offerSnapshotRepository;
    private final OfferSnapshotFactory offerSnapshotFactory;
    private final TravelOfferResolverClient travelOfferResolverClient;
    private final BookingNotificationDispatcher notificationDispatcher;
    private Clock clock;

    @Autowired
    public BookingService(
            BookingRepository bookingRepository,
            BookingReferenceGenerator referenceGenerator,
            BookingLifecycleProperties properties,
            OfferSnapshotRepository offerSnapshotRepository,
            OfferSnapshotFactory offerSnapshotFactory,
            @Autowired(required = false) TravelOfferResolverClient travelOfferResolverClient,
            @Autowired(required = false) BookingNotificationDispatcher notificationDispatcher) {
        this.bookingRepository = bookingRepository;
        this.referenceGenerator = referenceGenerator;
        this.properties = properties;
        this.offerSnapshotRepository = offerSnapshotRepository;
        this.offerSnapshotFactory = offerSnapshotFactory;
        this.travelOfferResolverClient = travelOfferResolverClient;
        this.notificationDispatcher = notificationDispatcher;
        this.clock = Clock.systemUTC();
    }

    public BookingService(
            BookingRepository bookingRepository,
            BookingReferenceGenerator referenceGenerator,
            BookingLifecycleProperties properties,
            OfferSnapshotRepository offerSnapshotRepository,
            OfferSnapshotFactory offerSnapshotFactory,
            TravelOfferResolverClient travelOfferResolverClient) {
        this(bookingRepository, referenceGenerator, properties, offerSnapshotRepository, offerSnapshotFactory, travelOfferResolverClient, null);
    }

    public BookingService(
            BookingRepository bookingRepository,
            BookingReferenceGenerator referenceGenerator,
            BookingLifecycleProperties properties) {
        this(bookingRepository, referenceGenerator, properties, null, null, null, null);
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
        return createDraft(userId, productType, null);
    }

    /**
     * Creates a new DRAFT booking and atomically attaches a trusted offer snapshot if selectionRef is provided.
     */
    public Booking createDraft(UUID userId, ProductType productType, String selectionRef) {
        Instant current = now();
        Instant expiresAt = current.plus(Duration.ofMinutes(properties.getDraftTtlMinutes()));

        String reference = allocateUniqueReference();
        Booking booking = Booking.createDraft(userId, productType, reference, current, expiresAt);

        log.info("Creating DRAFT booking [{}] for user {} (product: {}, expiresAt: {})",
                reference, userId, productType, expiresAt);
        Booking saved = saveWithOptimisticLockHandling(booking);

        if (selectionRef != null && !selectionRef.isBlank()) {
            attachOfferSnapshot(saved.getBookingReference(), selectionRef, userId, false);
        }

        return saved;
    }

    /**
     * Attaches an immutable offer snapshot to an existing DRAFT booking.
     * Resolves the offer from the server-side trusted selection store.
     */
    public OfferSnapshot attachOfferSnapshot(String bookingReference, String selectionRef, UUID requestingUserId, boolean privileged) {
        if (selectionRef == null || selectionRef.isBlank()) {
            throw new IllegalArgumentException("Selection reference is required to attach an offer snapshot");
        }

        Booking booking = getBookingByReference(bookingReference, requestingUserId, privileged);

        // Snapshot attachment is strictly restricted to DRAFT status
        if (booking.getStatus() != BookingStatus.DRAFT) {
            throw new BookingConflictException(String.format(
                    "Offer snapshot cannot be attached to booking [%s] in status %s. Only DRAFT bookings are eligible.",
                    booking.getBookingReference(), booking.getStatus()));
        }

        // Check if snapshot already exists (enforce 1 immutable snapshot per booking)
        if (offerSnapshotRepository != null && offerSnapshotRepository.existsByBookingId(booking.getId())) {
            throw new BookingConflictException(String.format(
                    "Booking [%s] already has an attached offer snapshot. Snapshots are immutable and cannot be replaced.",
                    booking.getBookingReference()));
        }

        // Resolve trusted offer from Travel Service
        ResolvedOfferDto resolvedOffer = null;
        if (travelOfferResolverClient != null) {
            resolvedOffer = travelOfferResolverClient.resolveOfferSelection(selectionRef)
                    .orElseThrow(() -> new BookingNotFoundException(
                            "Selected offer [" + selectionRef + "] was not found or has expired. Please select a fresh offer."));
        } else {
            throw new IllegalStateException("TravelOfferResolverClient is not configured to resolve offer selections");
        }

        OfferSnapshot snapshot = offerSnapshotFactory.createSnapshot(booking, resolvedOffer, now());

        log.info("Persisting immutable offer snapshot [hash={}] for booking [{}] (product: {}, provider: {}, providerOfferId: {})",
                snapshot.getSnapshotHash(), booking.getBookingReference(), snapshot.getProductType(), snapshot.getProvider(), snapshot.getProviderOfferId());

        return offerSnapshotRepository.saveAndFlush(snapshot);
    }

    /**
     * Retrieves the offer snapshot associated with a booking by reference.
     */
    @Transactional
    public Optional<OfferSnapshot> getSnapshotByBookingReference(String bookingReference, UUID requestingUserId, boolean privileged) {
        Booking booking = getBookingByReference(bookingReference, requestingUserId, privileged);
        if (offerSnapshotRepository == null) {
            return Optional.empty();
        }
        return offerSnapshotRepository.findByBookingId(booking.getId());
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
        Booking saved = saveWithOptimisticLockHandling(booking);
        if (notificationDispatcher != null) {
            notificationDispatcher.dispatchBookingCancelled(saved);
        }
        return saved;
    }

    /**
     * Retrieves all bookings owned by the authenticated user.
     */
    @Transactional
    public List<Booking> getUserBookings(UUID userId) {
        Instant current = now();
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(booking -> {
                    if (booking.isExpired(current)) {
                        booking.transitionTo(BookingStatus.EXPIRED, current);
                        return saveWithOptimisticLockHandling(booking);
                    }
                    return booking;
                })
                .toList();
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
        Booking saved = saveWithOptimisticLockHandling(booking);
        if (notificationDispatcher != null) {
            notificationDispatcher.dispatchPaymentFailed(saved, null, null, "EUR");
        }
        return saved;
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
        // CRITICAL TRUTH RULE: DO NOT dispatch BOOKING_CONFIRMED here! Zero confirmed emails on PAID.
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
        Booking saved = saveWithOptimisticLockHandling(booking);
        // CRITICAL TRUTH RULE: BOOKING_CONFIRMED fires ONLY on BookingStatus.CONFIRMED.
        if (notificationDispatcher != null) {
            notificationDispatcher.dispatchBookingConfirmed(saved);
        }
        return saved;
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
        Booking saved = saveWithOptimisticLockHandling(booking);
        if (notificationDispatcher != null) {
            notificationDispatcher.dispatchBookingCancelled(saved);
        }
        return saved;
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
        Booking saved = saveWithOptimisticLockHandling(booking);
        if (notificationDispatcher != null) {
            notificationDispatcher.dispatchRefundCompleted(saved, null, null, "EUR");
        }
        return saved;
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
