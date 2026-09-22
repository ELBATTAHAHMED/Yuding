package com.ahmed.reservationservice.domain.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.util.UUID;

/**
 * Thrown when a requested Booking cannot be found in PostgreSQL.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class BookingNotFoundException extends RuntimeException {

    private final UUID bookingId;

    public BookingNotFoundException(UUID bookingId) {
        super("Booking not found with ID: " + bookingId);
        this.bookingId = bookingId;
    }

    public UUID getBookingId() {
        return bookingId;
    }
}
