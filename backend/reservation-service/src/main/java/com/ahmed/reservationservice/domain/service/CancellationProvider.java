package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import java.util.UUID;

/** Provider-neutral boundary. Phase 51 ships only a local demo implementation. */
public interface CancellationProvider {
    Result cancel(Booking booking, OfferSnapshot snapshot, UUID requestId);

    record Result(boolean success, String provider, String reference, String status, String message) { }
}
