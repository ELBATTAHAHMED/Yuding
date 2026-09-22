package com.ahmed.travelservice.cache;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Centralized configuration properties for the Yuding V2 external API cache
 * and provider quota protection layer.
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.cache")
public class ExternalApiCacheProperties {

    /** Master switch to enable or disable Redis-backed external caching. */
    private boolean enabled = true;

    /** Logical cache schema version to avoid deserialization conflicts across deployments. */
    private String version = "v1";

    /** Centralized TTL policy per domain. */
    private Ttl ttl = new Ttl();

    @Data
    public static class Ttl {
        /** Geo autocomplete & structured places: 7 days default (stable reference data). */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration geoAutocomplete = Duration.ofDays(7);

        /** Forward & reverse geocoding: 7 days default. */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration geoGeocode = Duration.ofDays(7);

        /** Geo nearby POIs: 24 hours default. */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration geoPoi = Duration.ofHours(24);

        /** Live weather forecast: 15 minutes default (volatile meteorological data). */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration weather = Duration.ofMinutes(15);

        /** Currency reference rates: 24 hours default (daily central bank updates). */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration currency = Duration.ofHours(24);

        /** Pexels destination context photography: 24 hours default. */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration destinationImages = Duration.ofHours(24);

        /** Flight search results: 60 seconds default (volatile live airline fares). */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration flightSearch = Duration.ofSeconds(60);

        /** Hotel rates & availability: 120 seconds default. */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration hotelSearch = Duration.ofSeconds(120);

        /** Activity search results: 120 seconds default. */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration activitySearch = Duration.ofSeconds(120);

        /** Transfer availability results: 120 seconds default. */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration transferSearch = Duration.ofSeconds(120);

        /** Train journey search results: 120 seconds default. */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration trainSearch = Duration.ofSeconds(120);

        /** Negative caching for valid successful 200 empty responses: 30 seconds default. */
        @org.springframework.boot.convert.DurationUnit(java.time.temporal.ChronoUnit.SECONDS)
        private Duration emptyResult = Duration.ofSeconds(30);
    }
}
