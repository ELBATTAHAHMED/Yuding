package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for Transitous global public transport routing API (MOTIS v2).
 * Note: Transitous does not require an API key for normal public use.
 * A descriptive User-Agent is required per Transitous API usage policy.
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.transitous")
public class TransitousProperties {

    /**
     * Base URL for the Transitous REST API.
     * Default: https://api.transitous.org/api
     */
    private String baseUrl = "https://api.transitous.org/api";

    /**
     * Required User-Agent identifying the client application and contact.
     * Default: Yuding/2.0 (https://ahmedelbattah.vercel.app)
     */
    private String userAgent = "Yuding/2.0 (https://ahmedelbattah.vercel.app)";

    /**
     * Connect timeout in milliseconds.
     */
    private int connectTimeoutMs = 10000;

    /**
     * Read timeout in milliseconds.
     */
    private int readTimeoutMs = 20000;

    /**
     * Language code for geocoding / station search results (e.g. "fr", "en").
     */
    private String lang = "fr";
}
