package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Server-side configuration for the TomTom map tile proxy.
 * The API key never leaves travel-service.
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.tomtom")
public class TomTomProperties {

    private String apiKey = "";
    private String baseUrl = "https://api.tomtom.com";
    private int connectTimeoutMs = 10000;
    private int readTimeoutMs = 20000;

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
