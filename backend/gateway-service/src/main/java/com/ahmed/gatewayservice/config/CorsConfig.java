package com.ahmed.gatewayservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Centralized, Environment-Driven CORS Configuration for Spring Cloud Gateway.
 * 
 * Rules:
 * 1. Strict allowlist based on CORS_ALLOWED_ORIGINS.
 * 2. Never allow wildcard '*' with credentials.
 * 3. Never allow 'null' origin.
 * 4. Allowed headers include Authorization, Content-Type, Accept, X-Request-Id, X-Correlation-Id.
 * 5. Exposed headers include X-Request-Id, X-Correlation-Id.
 * 6. Supports HttpOnly refresh cookie transmission (allowCredentials = true).
 */
@Configuration
public class CorsConfig {

    private static final Logger log = LoggerFactory.getLogger(CorsConfig.class);

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:63342,http://127.0.0.1:5500}") String allowedOriginsRaw) {

        CorsConfiguration config = new CorsConfiguration();

        List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty() && !s.equals("*") && !s.equalsIgnoreCase("null"))
                .collect(Collectors.toList());

        if (origins.isEmpty()) {
            log.warn("CORS: No valid origins configured in CORS_ALLOWED_ORIGINS. All cross-origin requests will be rejected.");
        } else {
            log.info("CORS: Configured allowed origins: {}", origins);
            config.setAllowedOrigins(origins);
        }

        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "X-Request-Id",
                "X-Correlation-Id",
                "X-Requested-With",
                "Origin"
        ));
        config.setExposedHeaders(List.of(
                "X-Request-Id",
                "X-Correlation-Id"
        ));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
