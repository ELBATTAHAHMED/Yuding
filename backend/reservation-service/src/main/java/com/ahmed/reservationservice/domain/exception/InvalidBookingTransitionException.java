package com.ahmed.reservationservice.domain.exception;

import com.ahmed.reservationservice.domain.model.BookingStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when an illegal state transition is attempted on a Booking.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidBookingTransitionException extends RuntimeException {

    private final BookingStatus currentStatus;
    private final BookingStatus targetStatus;

    public InvalidBookingTransitionException(BookingStatus currentStatus, BookingStatus targetStatus) {
        super(String.format("Invalid booking state transition from %s to %s", currentStatus, targetStatus));
        this.currentStatus = currentStatus;
        this.targetStatus = targetStatus;
    }

    public BookingStatus getCurrentStatus() {
        return currentStatus;
    }

    public BookingStatus getTargetStatus() {
        return targetStatus;
    }
}
