package com.ahmed.reservationservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@EnableFeignClients
@SpringBootApplication
public class ReservationServiceApplication {

    public static void main(String[] args) {
        loadLocalEnvIfPresent();
        SpringApplication.run(ReservationServiceApplication.class, args);
    }

    private static void loadLocalEnvIfPresent() {
        java.util.List<java.nio.file.Path> candidates = java.util.List.of(
                java.nio.file.Path.of(".env.local"),
                java.nio.file.Path.of("backend/reservation-service/.env.local"),
                java.nio.file.Path.of("../.env.local")
        );

        for (java.nio.file.Path path : candidates) {
            if (java.nio.file.Files.exists(path)) {
                try {
                    java.util.List<String> lines = java.nio.file.Files.readAllLines(path);
                    for (String line : lines) {
                        String trimmed = line.trim();
                        if (!trimmed.isEmpty() && !trimmed.startsWith("#") && trimmed.contains("=")) {
                            int idx = trimmed.indexOf('=');
                            String key = trimmed.substring(0, idx).trim();
                            String val = trimmed.substring(idx + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                if (val.length() >= 2) {
                                    val = val.substring(1, val.length() - 1).trim();
                                }
                            }
                            if (!key.isEmpty()) {
                                System.setProperty(key, val);
                                if ("PAYMENT_PROVIDER".equals(key)) {
                                    System.setProperty("yuding.payment.provider", val);
                                } else if ("PAYPAL_ENV".equals(key)) {
                                    System.setProperty("yuding.payment.paypal.env", val);
                                } else if ("PAYPAL_BASE_URL".equals(key)) {
                                    System.setProperty("yuding.payment.paypal.base-url", val);
                                } else if ("PAYPAL_CLIENT_ID".equals(key)) {
                                    System.setProperty("yuding.payment.paypal.client-id", val);
                                } else if ("PAYPAL_CLIENT_SECRET".equals(key)) {
                                    System.setProperty("yuding.payment.paypal.client-secret", val);
                                }
                            }
                        }
                    }
                    break;
                } catch (Exception ignored) {
                    // Fail-safe: continue startup if file cannot be read
                }
            }
        }

        String paypalClientId = System.getProperty("yuding.payment.paypal.client-id");
        if (paypalClientId == null) {
            paypalClientId = System.getenv("PAYPAL_CLIENT_ID");
        }
        boolean configured = paypalClientId != null && !paypalClientId.isBlank();
        String prefix = (configured && paypalClientId.length() >= 5) ? paypalClientId.substring(0, 5) : "none";
        int len = configured ? paypalClientId.length() : 0;
        System.out.println("[DIAGNOSTIC] PAYPAL_CLIENT_ID configured=" + configured + " prefix=" + prefix + " length=" + len);

        String provider = System.getProperty("yuding.payment.provider");
        if (provider == null) {
            provider = System.getenv("PAYMENT_PROVIDER");
        }
        System.out.println("[DIAGNOSTIC] Active PAYMENT_PROVIDER=" + (provider != null ? provider : "default"));
    }

    @Bean
    RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
