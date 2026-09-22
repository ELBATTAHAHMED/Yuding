package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

/**
 * Gatekeeper policy determining whether a Booking is eligible to proceed to Phase 37 server pricing.
 * Invariant: An outdated / unverified search price can NEVER flow toward server pricing or payment.
 */
@Component
public class BookingReadinessPolicy {

    private final Clock clock;

    public BookingReadinessPolicy() {
        this(Clock.systemUTC());
    }

    public BookingReadinessPolicy(Clock clock) {
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    /**
     * Determines whether the booking is eligible to proceed to server pricing.
     */
    public boolean canProceedToServerPricing(Booking booking, OfferSnapshot snapshot, OfferRevalidation latestRevalidation) {
        if (booking == null || booking.getStatus() != BookingStatus.DRAFT) {
            return false;
        }

        if (snapshot == null || latestRevalidation == null) {
            return false;
        }

        // Must be fresh according to server clock
        Instant now = Instant.now(clock);
        if (latestRevalidation.getValidUntil() == null || !now.isBefore(latestRevalidation.getValidUntil())) {
            return false;
        }

        // Must be positively AVAILABLE
        if (!"AVAILABLE".equalsIgnoreCase(latestRevalidation.getAvailabilityStatus())) {
            return false;
        }

        // Price checks
        String priceStatus = latestRevalidation.getPriceStatus();
        if (priceStatus == null) {
            return false;
        }

        switch (priceStatus.toUpperCase()) {
            case "UNCHANGED":
            case "NOT_APPLICABLE":
                return true;
            case "CHANGED":
                // If price changed, user MUST have explicitly acknowledged THIS exact revalidation quote
                return latestRevalidation.getPriceChangeAcceptedAt() != null;
            case "NOT_AVAILABLE":
            default:
                return false;
        }
    }
}
