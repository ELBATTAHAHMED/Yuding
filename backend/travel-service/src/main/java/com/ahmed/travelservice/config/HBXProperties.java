package com.ahmed.travelservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for HBX Group / Hotelbeds APITUDE suites.
 * Bound from 'travel.hbx.*'.
 */
@Data
@Component
@ConfigurationProperties(prefix = "travel.hbx")
public class HBXProperties {

    private SuiteConfig activities = new SuiteConfig("https://api.test.hotelbeds.com/activity-api/3.0");
    private SuiteConfig transfers = new SuiteConfig("https://api.test.hotelbeds.com/transfer-api/1.0");

    @Data
    public static class SuiteConfig {
        private String apiKey = "";
        private String secret = "";
        private String baseUrl;
        private int connectTimeoutMs = 10000;
        private int readTimeoutMs = 20000;

        public SuiteConfig() {
        }

        public SuiteConfig(String defaultBaseUrl) {
            this.baseUrl = defaultBaseUrl;
        }
    }
}
