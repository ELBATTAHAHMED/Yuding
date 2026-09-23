package com.ahmed.reservationservice.domain.model;

/**
 * Read-only receipt state derived from authoritative booking and payment facts.
 * It deliberately does not add lifecycle states to {@link BookingStatus}.
 */
public enum ConfirmationState {
    AWAITING_PAYMENT,
    PAYMENT_VERIFICATION_PENDING,
    PAYMENT_FAILED,
    PAYMENT_VERIFIED_AWAITING_PROVIDER_CONFIRMATION,
    PENDING_PROVIDER_CONFIRMATION,
    CONFIRMED,
    CANCELLED,
    REFUNDED,
    EXPIRED,
    INCONSISTENT_STATE
}
