package com.ahmed.notificationservice.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "yuding.notification")
@Getter
@Setter
public class NotificationProperties {

    private String fromAddress = "no-reply@yuding.local";
    private String fromName = "Yuding";
    private String frontendBaseUrl = "http://localhost:3000";
    private int maxAttempts = 5;
    private int staleProcessingTimeoutMinutes = 5;
    private boolean workerEnabled = true;
    private long workerFixedDelayMs = 2000;
    private String activeProvider = "smtp";
}
