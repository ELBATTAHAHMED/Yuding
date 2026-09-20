package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for the Scrappa Google Flights provider.
 * Bound to 'travel.scrappa' prefix.
 * The API key must only be supplied via process environment (SCRAPPA_API_KEY).
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.scrappa")
public class ScrappaProperties {

    /**
     * API key for Scrappa authentication (passed via X-API-KEY header).
     * NEVER hardcode or commit. Injected via environment variable SCRAPPA_API_KEY.
     */
    private String apiKey;

    /**
     * Base URL for the Scrappa API.
     * Default: https://scrappa.co/api
     */
    private String baseUrl = "https://scrappa.co/api";

    /**
     * HTTP connect timeout in milliseconds.
     */
    private int connectTimeoutMs = 5000;

    /**
     * HTTP read timeout in milliseconds.
     */
    private int readTimeoutMs = 15000;

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
