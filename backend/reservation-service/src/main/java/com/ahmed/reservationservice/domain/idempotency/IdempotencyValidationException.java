package com.ahmed.reservationservice.domain.idempotency;

import lombok.Getter;

/**
 * Thrown when an Idempotency-Key header is missing, malformed, or exceeds bounds.
 */
@Getter
public class IdempotencyValidationException extends RuntimeException {

    private final String errorCode;

    public IdempotencyValidationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
