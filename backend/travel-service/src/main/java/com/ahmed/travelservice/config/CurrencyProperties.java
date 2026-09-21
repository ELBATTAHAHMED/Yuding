package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Presentation currency policy. Provider prices always remain in their original currency. */
@Data
@Component
@ConfigurationProperties(prefix = "travel.currency")
public class CurrencyProperties {
    private String displayCurrency = "MAD";
}
