package com.ahmed.travelservice.domain.enums;

/**
 * Normalized availability status resulting from live provider revalidation.
 */
public enum OfferAvailabilityStatus {
    /** Positively verified that the provider currently offers the selected product/itinerary/rate. */
    AVAILABLE,

    /** Positively verified that the provider responded successfully and the selected offer/rate is no longer available. */
    UNAVAILABLE,

    /** Availability could not be safely or deterministically determined. */
    UNKNOWN,

    /** Revalidation cannot be safely performed without prohibited transactional actions. */
    REVALIDATION_UNSUPPORTED
}
