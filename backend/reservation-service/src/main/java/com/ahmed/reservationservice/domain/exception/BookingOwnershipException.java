package com.ahmed.reservationservice.domain.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.UUID;

/**
 * Thrown when an authenticated user attempts to access or modify a booking they do not own.
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class BookingOwnershipException extends RuntimeException {

    private final UUID bookingId;
    private final UUID userId;

    public BookingOwnershipException(UUID bookingId, UUID userId) {
        super(String.format("User %s is not authorized to access or modify booking %s", userId, bookingId));
        this.bookingId = bookingId;
        this.userId = userId;
    }

    public UUID getBookingId() {
        return bookingId;
    }

    public UUID getUserId() {
        return userId;
    }
}
