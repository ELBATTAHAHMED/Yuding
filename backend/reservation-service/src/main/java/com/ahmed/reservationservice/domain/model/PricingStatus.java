package com.ahmed.reservationservice.domain.model;

/**
 * Server-authoritative status for a finalized pricing quote.
 */
public enum PricingStatus {
    /**
     * Complete authoritative monetary quote successfully computed and ready for payment.
     */
    PRICED,

    /**
     * Offer has no monetary fare available from provider (e.g., ONCF / Transitous schedule-only train).
     */
    NOT_PRICED,

    /**
     * Product is non-payable or monetary pricing is not applicable.
     */
    NOT_APPLICABLE
}
