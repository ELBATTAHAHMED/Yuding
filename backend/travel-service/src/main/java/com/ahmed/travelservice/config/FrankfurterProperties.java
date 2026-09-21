package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Non-secret configuration for Frankfurter's public v2 API. */
@Data
@Component
@ConfigurationProperties(prefix = "travel.frankfurter")
public class FrankfurterProperties {
    private String baseUrl = "https://api.frankfurter.dev";
    private int connectTimeoutMs = 10000;
    private int readTimeoutMs = 20000;

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank();
    }
}
