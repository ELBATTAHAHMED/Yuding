package com.ahmed.reservationservice.domain.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for Yuding V2 Payment Provider Abstraction.
 * Enforces PayPal Sandbox isolation by default.
 */
@Configuration
@ConfigurationProperties(prefix = "yuding.payment")
@Getter
@Setter
public class PaymentProperties {

    /**
     * Active payment provider name: "paypal-sandbox" or "mock".
     */
    private String provider = "paypal-sandbox";

    private Paypal paypal = new Paypal();

    @Getter
    @Setter
    public static class Paypal {
        private String env = "sandbox";
        private String baseUrl = "https://api-m.sandbox.paypal.com";
        private String clientId = "";
        private String clientSecret = "";
        private String webhookId = "";

        public boolean isConfigured() {
            return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
        }

        public boolean isWebhookConfigured() {
            return webhookId != null && !webhookId.isBlank();
        }
    }
}
