package com.ahmed.reservationservice.domain.model;

/**
 * Server-authoritative lifecycle statuses for Yuding V2 Bookings.
 * Persisted exclusively as STRING in PostgreSQL database schema booking.
 */
public enum BookingStatus {
    DRAFT,
    PENDING_PAYMENT,
    PAYMENT_FAILED,
    PAID,
    PENDING_PROVIDER_CONFIRMATION,
    CONFIRMED,
    CANCELLED,
    REFUNDED,
    EXPIRED;

    /**
     * Determines whether the status is a terminal state that rejects future transitions.
     */
    public boolean isTerminal() {
        return this == REFUNDED || this == EXPIRED;
    }

    /**
     * Determines whether the booking in this status can naturally expire.
     */
    public boolean canExpire() {
        return this == DRAFT || this == PENDING_PAYMENT || this == PAYMENT_FAILED;
    }
}
