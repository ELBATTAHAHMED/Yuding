package com.ahmed.reservationservice.domain.idempotency;

/**
 * State of an idempotent command execution.
 */
public enum IdempotencyStatus {
    IN_PROGRESS,
    COMPLETED,
    FAILED_RETRYABLE,
    FAILED_FINAL
}
