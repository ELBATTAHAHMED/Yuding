package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;

/**
 * Readiness policy determining whether a Booking with authoritative pricing is eligible to proceed
 * toward Phase 38 Payment Preparation.
 */
@Component
public class BookingPricingReadinessPolicy {

    private final Clock clock;

    public BookingPricingReadinessPolicy() {
        this(Clock.systemUTC());
    }

    public BookingPricingReadinessPolicy(Clock clock) {
        this.clock = clock != null ? clock : Clock.systemUTC();
    }

    /**
     * Determines whether the booking has a fresh, valid, and payable server pricing quote.
     */
    public boolean canProceedToPaymentPreparation(Booking booking, ServerPricingQuote quote, OfferRevalidation latestRevalidation) {
        if (booking == null || booking.getStatus() != BookingStatus.DRAFT) {
            return false;
        }

        if (quote == null || latestRevalidation == null) {
            return false;
        }

        // Quote MUST be bound to the latest eligible revalidation (newer revalidation supersedes old quote)
        if (!quote.getRevalidationId().equals(latestRevalidation.getId())) {
            return false;
        }

        Instant now = Instant.now(clock);

        // Neither quote nor underlying revalidation can be expired
        if (quote.getValidUntil() == null || !now.isBefore(quote.getValidUntil())) {
            return false;
        }
        if (latestRevalidation.getValidUntil() == null || !now.isBefore(latestRevalidation.getValidUntil())) {
            return false;
        }

        // Pricing status must be PRICED with positive total and currency
        if (quote.getPricingStatus() != PricingStatus.PRICED) {
            return false;
        }

        if (quote.getTotalAmount() == null || quote.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        return quote.getCurrency() != null && !quote.getCurrency().isBlank();
    }
}
