package com.ahmed.reservationservice.domain.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configurable TTL properties for booking lifecycle states.
 */
@Configuration
@ConfigurationProperties(prefix = "yuding.booking.lifecycle")
@Getter
@Setter
public class BookingLifecycleProperties {

    /**
     * Time to live for DRAFT bookings in minutes. Default: 30 minutes.
     */
    private int draftTtlMinutes = 30;

    /**
     * Time to live for PENDING_PAYMENT bookings in minutes. Default: 15 minutes.
     */
    private int pendingPaymentTtlMinutes = 15;
}
