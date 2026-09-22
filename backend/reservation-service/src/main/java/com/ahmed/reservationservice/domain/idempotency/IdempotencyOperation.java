package com.ahmed.reservationservice.domain.idempotency;

/**
 * Stable server-side operation identifiers for idempotency records.
 */
public enum IdempotencyOperation {
    BOOKING_CREATE,
    PAYMENT_CREATE,
    PAYMENT_CAPTURE,
    PAYMENT_REFUND
}
