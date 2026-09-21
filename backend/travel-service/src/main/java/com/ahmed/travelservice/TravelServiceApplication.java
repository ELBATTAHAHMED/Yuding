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
                                } else if ("TRAVEL_ACTIVITIES_PROVIDER".equals(key)) {
                                    System.setProperty("travel.providers.activities", val);
                                } else if ("TRAVEL_TRANSFERS_PROVIDER".equals(key)) {
                                    System.setProperty("travel.providers.transfers", val);
                                } else if ("HBX_ACTIVITIES_API_KEY".equals(key)) {
                                    System.setProperty("travel.hbx.activities.api-key", val);
                                } else if ("HBX_ACTIVITIES_SECRET".equals(key)) {
                                    System.setProperty("travel.hbx.activities.secret", val);
                                } else if ("HBX_ACTIVITIES_BASE_URL".equals(key)) {
                                    System.setProperty("travel.hbx.activities.base-url", val);
                                } else if ("HBX_TRANSFERS_API_KEY".equals(key)) {
                                    System.setProperty("travel.hbx.transfers.api-key", val);
                                } else if ("HBX_TRANSFERS_SECRET".equals(key)) {
                                    System.setProperty("travel.hbx.transfers.secret", val);
                                } else if ("HBX_TRANSFERS_BASE_URL".equals(key)) {
                                    System.setProperty("travel.hbx.transfers.base-url", val);
                                } else if ("TRAVEL_TRAINS_PROVIDER".equals(key)) {
                                    System.setProperty("travel.providers.trains", val);
                                } else if ("TRANSITLAND_API_KEY".equals(key)) {
                                    System.setProperty("travel.transitland.api-key", val);
                                } else if ("TRANSITLAND_BASE_URL".equals(key)) {
                                    System.setProperty("travel.transitland.base-url", val);
                                } else if ("TRANSITLAND_ONCF_OPERATOR_ID".equals(key)) {
                                    System.setProperty("travel.transitland.oncf-operator-id", val);
                                } else if ("TRANSITLAND_ONCF_FEED_ID".equals(key)) {
                                    System.setProperty("travel.transitland.oncf-feed-id", val);
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

        logHbxStatus("HBX Activities", "HBX_ACTIVITIES_API_KEY", "HBX_ACTIVITIES_SECRET");
        logHbxStatus("HBX Transfers", "HBX_TRANSFERS_API_KEY", "HBX_TRANSFERS_SECRET");
        logTransitlandStatus();
    }

    private static void logTransitlandStatus() {
        String key = System.getProperty("TRANSITLAND_API_KEY");
        if (key == null) {
            key = System.getenv("TRANSITLAND_API_KEY");
        }
        String baseUrl = System.getProperty("TRANSITLAND_BASE_URL");
        if (baseUrl == null) {
            baseUrl = System.getenv("TRANSITLAND_BASE_URL");
        }
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://transit.land/api/v2/rest";
        }
        boolean keyCfg = key != null && !key.isBlank();
        System.out.println("[DIAGNOSTIC] Transitland Trains: key=" + (keyCfg ? "configured" : "missing") + ", baseUrl=" + baseUrl);
    }

    private static void logHbxStatus(String suite, String keyVar, String secretVar) {
        String key = System.getProperty(keyVar);
        if (key == null) {
            key = System.getenv(keyVar);
        }
        String secret = System.getProperty(secretVar);
        if (secret == null) {
            secret = System.getenv(secretVar);
        }
        boolean keyCfg = key != null && !key.isBlank();
        boolean secCfg = secret != null && !secret.isBlank();
        System.out.println("[DIAGNOSTIC] " + suite + ": key=" + (keyCfg ? "configured" : "missing") + ", secret=" + (secCfg ? "configured" : "missing"));
    }
}
