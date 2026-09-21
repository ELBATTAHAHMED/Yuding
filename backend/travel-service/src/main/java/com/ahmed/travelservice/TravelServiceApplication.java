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
                            if (!key.isEmpty()) {
                                System.setProperty(key, val);
                            }
                        }
                    }
                    break;
                } catch (Exception ignored) {
                    // Fail-safe: continue startup if file cannot be read
                }
            }
        }
    }
}
