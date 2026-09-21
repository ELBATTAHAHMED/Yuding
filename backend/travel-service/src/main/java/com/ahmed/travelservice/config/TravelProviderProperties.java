package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "travel.providers")
public class TravelProviderProperties {
    private String flights = "none";
    private String hotels = "none";
    private String activities = "none";
    private String transfers = "none";
    private String trains = "oncf_gtfs";
    private String defaultProvider = "none";
}
