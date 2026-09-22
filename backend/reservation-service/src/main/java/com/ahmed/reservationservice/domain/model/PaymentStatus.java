package com.ahmed.reservationservice.domain.model;

/**
 * Server-authoritative lifecycle statuses for Yuding V2 Payments.
 * Persisted strictly in PostgreSQL schema payment.
 */
public enum PaymentStatus {
    INITIATED,
    REQUIRES_ACTION,
    AWAITING_WEBHOOK,
    SUCCEEDED,
    FAILED,
    REFUNDED;

    public boolean isTerminal() {
        return this == SUCCEEDED || this == FAILED || this == REFUNDED;
    }
}
