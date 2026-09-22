package com.ahmed.reservationservice.domain.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a public booking reference string violates the required YUD-XXXXXXXX format or alphabet.
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidBookingReferenceException extends RuntimeException {

    private final String invalidReference;

    public InvalidBookingReferenceException(String invalidReference) {
        super("Invalid booking reference format: " + invalidReference + ". Expected format: YUD-XXXXXXXX (8 uppercase alphanumeric characters).");
        this.invalidReference = invalidReference;
    }

    public String getInvalidReference() {
        return invalidReference;
    }
}
