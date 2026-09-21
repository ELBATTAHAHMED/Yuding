package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for Geoapify Geo & Places API (Phase 26).
 * Bound to prefix "travel.geoapify".
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.geoapify")
public class GeoapifyProperties {

    /**
     * API key for Geoapify. Never exposed to clients or logged.
     */
    private String apiKey = "";

    /**
     * Base URL for Geoapify Geocoding and Places API endpoints.
     */
    private String baseUrl = "https://api.geoapify.com";

    /**
     * Base URL for Geoapify Maps / Static Maps API.
     */
    private String mapsBaseUrl = "https://maps.geoapify.com";

    /**
     * Default language for geocoding and places responses (ISO 639-1 code).
     */
    private String defaultLanguage = "en";

    /**
     * Default number of autocomplete suggestions to return.
     */
    private int autocompleteLimit = 8;

    /**
     * Default number of nearby places to return.
     */
    private int placesLimit = 20;

    /**
     * HTTP connect timeout in milliseconds.
     */
    private int connectTimeoutMs = 10000;

    /**
     * HTTP read timeout in milliseconds.
     */
    private int readTimeoutMs = 20000;

    /**
     * Returns true if a non-blank API key has been configured.
     */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
