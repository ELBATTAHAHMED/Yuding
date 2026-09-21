package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for the Transitland v2 REST API train provider.
 * Bound from 'travel.transitland.*'.
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.transitland")
public class TransitlandProperties {

    /**
     * Transitland API Key.
     * Sourced from TRANSITLAND_API_KEY environment variable. Never log or leak this value.
     */
    private String apiKey = "";

    /**
     * Transitland REST API v2 base URL.
     * Default: https://transit.land/api/v2/rest
     */
    private String baseUrl = "https://transit.land/api/v2/rest";

    /**
     * HTTP connect timeout in milliseconds.
     */
    private int connectTimeoutMs = 10000;

    /**
     * HTTP read timeout in milliseconds.
     */
    private int readTimeoutMs = 20000;

    /**
     * ONCF operator Onestop ID.
     * Default: o-oncf~morocco
     */
    private String oncfOperatorId = "o-oncf~morocco";

    /**
     * ONCF rail feed Onestop ID.
     * Default: f-oncf~morocco~rail
     */
    private String oncfFeedId = "f-oncf~morocco~rail";
}
