package com.ahmed.reservationservice.domain.model;

import com.ahmed.reservationservice.domain.exception.InvalidBookingTransitionException;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Centralized lifecycle and state-transition authority for Yuding V2 Bookings.
 * Enforces server-authoritative validation rules for all 9 domain statuses.
 */
public final class BookingLifecycle {

    private static final Map<BookingStatus, Set<BookingStatus>> TRANSITION_MATRIX;

    static {
        Map<BookingStatus, Set<BookingStatus>> matrix = new EnumMap<>(BookingStatus.class);

        // 1. DRAFT -> PENDING_PAYMENT, CANCELLED, EXPIRED
        matrix.put(BookingStatus.DRAFT, Collections.unmodifiableSet(EnumSet.of(
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.CANCELLED,
                BookingStatus.EXPIRED
        )));

        // 2. PENDING_PAYMENT -> PAID, PAYMENT_FAILED, CANCELLED, EXPIRED
        matrix.put(BookingStatus.PENDING_PAYMENT, Collections.unmodifiableSet(EnumSet.of(
                BookingStatus.PAID,
                BookingStatus.PAYMENT_FAILED,
                BookingStatus.CANCELLED,
                BookingStatus.EXPIRED
        )));

        // 3. PAYMENT_FAILED -> PENDING_PAYMENT (retry), CANCELLED, EXPIRED
        matrix.put(BookingStatus.PAYMENT_FAILED, Collections.unmodifiableSet(EnumSet.of(
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.CANCELLED,
                BookingStatus.EXPIRED
        )));

        // 4. PAID -> PENDING_PROVIDER_CONFIRMATION, REFUNDED
        matrix.put(BookingStatus.PAID, Collections.unmodifiableSet(EnumSet.of(
                BookingStatus.PENDING_PROVIDER_CONFIRMATION,
                BookingStatus.REFUNDED
        )));

        // 5. PENDING_PROVIDER_CONFIRMATION -> CONFIRMED, REFUNDED
        matrix.put(BookingStatus.PENDING_PROVIDER_CONFIRMATION, Collections.unmodifiableSet(EnumSet.of(
                BookingStatus.CONFIRMED,
                BookingStatus.REFUNDED
        )));

        // 6. CONFIRMED -> CANCELLED
        matrix.put(BookingStatus.CONFIRMED, Collections.unmodifiableSet(EnumSet.of(
                BookingStatus.CANCELLED
        )));

        // 7. CANCELLED -> REFUNDED (via future valid refund workflow)
        matrix.put(BookingStatus.CANCELLED, Collections.unmodifiableSet(EnumSet.of(
                BookingStatus.REFUNDED
        )));

        // 8. REFUNDED -> Terminal
        matrix.put(BookingStatus.REFUNDED, Collections.emptySet());

        // 9. EXPIRED -> Terminal
        matrix.put(BookingStatus.EXPIRED, Collections.emptySet());

        TRANSITION_MATRIX = Collections.unmodifiableMap(matrix);
    }

    private BookingLifecycle() {}

    /**
     * Checks if a transition from current status to target status is valid.
     */
    public static boolean canTransition(BookingStatus from, BookingStatus to) {
        if (from == null || to == null) {
            return false;
        }
        if (from == to) {
            return false;
        }
        Set<BookingStatus> allowedTargets = TRANSITION_MATRIX.getOrDefault(from, Collections.emptySet());
        return allowedTargets.contains(to);
    }

    /**
     * Validates that a transition from current status to target status is allowed.
     * Throws InvalidBookingTransitionException if forbidden.
     */
    public static void validateTransition(BookingStatus from, BookingStatus to) {
        if (!canTransition(from, to)) {
            throw new InvalidBookingTransitionException(from, to);
        }
    }

    /**
     * Returns an unmodifiable set of allowed next statuses for the given current status.
     */
    public static Set<BookingStatus> getAllowedTransitions(BookingStatus currentStatus) {
        if (currentStatus == null) {
            return Collections.emptySet();
        }
        return TRANSITION_MATRIX.getOrDefault(currentStatus, Collections.emptySet());
    }
}
