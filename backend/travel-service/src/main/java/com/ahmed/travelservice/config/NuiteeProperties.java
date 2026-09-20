package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for the Nuitee Connect / LiteAPI v3 hotel search provider.
 * Bound from 'travel.nuitee.*'.
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.nuitee")
public class NuiteeProperties {

    /**
     * Nuitee Connect private API key (e.g. sandbox key).
     * Sourced from NUITEE_API_KEY environment variable. Never log or leak this value.
     */
    private String apiKey = "";

    /**
     * Nuitee Connect REST API base URL.
     * Default: https://api.liteapi.travel/v3.0
     */
    private String baseUrl = "https://api.liteapi.travel/v3.0";

    /**
     * HTTP connect timeout in milliseconds.
     */
    private int connectTimeoutMs = 10000;

    /**
     * HTTP read timeout in milliseconds.
     */
    private int readTimeoutMs = 20000;
}
