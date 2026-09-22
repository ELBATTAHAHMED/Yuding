package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for the Pexels Image Provider.
 * Encapsulates API credentials and client settings.
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.pexels")
public class PexelsProperties {

    /** Pexels REST API Key (Authorization header). Loaded from environment. */
    private String apiKey = "";

    /** Base URL of the Pexels REST API. */
    private String baseUrl = "https://api.pexels.com";

    /** Default limit of destination context photos to request. */
    private int destinationLimit = 3;

    /** HTTP connect timeout in milliseconds. */
    private int connectTimeoutMs = 10000;

    /** HTTP read timeout in milliseconds. */
    private int readTimeoutMs = 20000;

    /**
     * Check if Pexels API key is properly configured.
     */
    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isBlank();
    }
}
