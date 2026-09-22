package com.ahmed.reservationservice.domain.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configurable properties for live offer revalidations.
 */
@Configuration
@ConfigurationProperties(prefix = "yuding.booking.revalidation")
@Getter
@Setter
public class BookingRevalidationProperties {

    /**
     * Validity window for successful revalidation results in seconds. Default: 300 (5 minutes).
     */
    private int ttlSeconds = 300;
}
