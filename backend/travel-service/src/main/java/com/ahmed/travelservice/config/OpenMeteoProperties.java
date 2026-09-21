package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Non-secret configuration for the Open-Meteo forecast endpoint.
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.open-meteo")
public class OpenMeteoProperties {

    private String baseUrl = "https://api.open-meteo.com";
    private int forecastDays = 7;
    private String timezone = "auto";
    private int connectTimeoutMs = 10000;
    private int readTimeoutMs = 20000;

    public boolean isConfigured() {
        return baseUrl != null && !baseUrl.isBlank();
    }
}
