package com.ahmed.reservationservice.domain.idempotency;

import lombok.Getter;

/**
 * Thrown when an idempotency key is reused with mismatched parameters or an operation is currently in progress.
 */
@Getter
public class IdempotencyConflictException extends RuntimeException {

    private final String errorCode;

    public IdempotencyConflictException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
