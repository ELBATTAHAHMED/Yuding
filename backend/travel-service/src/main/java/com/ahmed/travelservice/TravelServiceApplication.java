package com.ahmed.travelservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class TravelServiceApplication {

    public static void main(String[] args) {
        loadLocalEnvIfPresent();
        SpringApplication.run(TravelServiceApplication.class, args);
    }

    private static void loadLocalEnvIfPresent() {
        java.util.List<java.nio.file.Path> candidates = java.util.List.of(
                java.nio.file.Path.of(".env.local"),
                java.nio.file.Path.of("backend/travel-service/.env.local"),
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
                                if ("NUITEE_API_KEY".equals(key)) {
                                    System.setProperty("travel.nuitee.api-key", val);
                                } else if ("NUITEE_BASE_URL".equals(key)) {
                                    System.setProperty("travel.nuitee.base-url", val);
                                } else if ("TRAVEL_HOTELS_PROVIDER".equals(key)) {
                                    System.setProperty("travel.providers.hotels", val);
                                } else if ("SCRAPPA_API_KEY".equals(key)) {
                                    System.setProperty("travel.scrappa.api-key", val);
                                } else if ("TRAVEL_FLIGHTS_PROVIDER".equals(key)) {
                                    System.setProperty("travel.providers.flights", val);
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

        String nuiteeKey = System.getProperty("NUITEE_API_KEY");
        if (nuiteeKey == null) {
            nuiteeKey = System.getenv("NUITEE_API_KEY");
        }
        boolean configured = nuiteeKey != null && !nuiteeKey.isBlank();
        String prefix = (configured && nuiteeKey.length() >= 5) ? nuiteeKey.substring(0, 5) : "none";
        int len = configured ? nuiteeKey.length() : 0;
        System.out.println("[DIAGNOSTIC] NUITEE_API_KEY configured=" + configured + " prefix=" + prefix + " length=" + len);
    }
}
