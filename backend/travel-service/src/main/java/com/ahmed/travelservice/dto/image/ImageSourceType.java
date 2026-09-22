package com.ahmed.travelservice.dto.image;

/**
 * Declares the authoritative provenance and source type of an image asset.
 */
public enum ImageSourceType {
    /**
     * Contextual stock travel photo depicting a destination, region, or city.
     * Not tied to a specific business property or activity.
     */
    STOCK_DESTINATION,

    /**
     * Authoritative photo supplied directly by an upstream provider
     * (e.g. Nuitee for hotels, HBX for activities).
     */
    PROVIDER_ENTITY,

    /**
     * Hand-curated, verified image provided directly by Yuding for exclusive offerings.
     */
    YUDING_CURATED,

    /**
     * Neutral fallback placeholder (e.g. geometric graphic/icon).
     * Does not misrepresent itself as a real photo.
     */
    PLACEHOLDER
}
