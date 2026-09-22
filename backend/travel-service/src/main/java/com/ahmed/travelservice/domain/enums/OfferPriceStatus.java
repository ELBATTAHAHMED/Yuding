package com.ahmed.travelservice.domain.enums;

/**
 * Normalized price comparison status between snapshot and current live provider quote.
 */
public enum OfferPriceStatus {
    /** Current provider price and currency match snapshot price exactly. */
    UNCHANGED,

    /** Current provider price differs from snapshot price (increase, decrease, or currency change). */
    CHANGED,

    /** Offer was unavailable or provider did not return a current price. */
    NOT_AVAILABLE,

    /** Product inherently does not provide a live fare/price (e.g. timetable schedules). */
    NOT_APPLICABLE
}
