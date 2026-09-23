package com.ahmed.gatewayservice.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CorsConfigurationTest {

    private final CorsConfig corsConfig = new CorsConfig();

    @Test
    @DisplayName("CORS allows configured dev origin with credentials and exposed headers")
    void cors_allowsConfiguredOrigin() {
        CorsConfigurationSource source = corsConfig.corsConfigurationSource("http://localhost:3000,http://localhost:63342");

        MockServerHttpRequest request = MockServerHttpRequest.get("/apir/reservations/me")
                .header("Origin", "http://localhost:3000")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        CorsConfiguration config = source.getCorsConfiguration(exchange);
        assertThat(config).isNotNull();
        assertThat(config.getAllowedOrigins()).containsExactly("http://localhost:3000", "http://localhost:63342");
        assertThat(config.getAllowCredentials()).isTrue();
        assertThat(config.getExposedHeaders()).contains("X-Request-Id", "X-Correlation-Id", "Idempotent-Replayed");
        assertThat(config.getAllowedHeaders()).contains("Authorization", "Content-Type", "Accept", "X-Request-Id", "X-Correlation-Id", "Idempotency-Key");
        assertThat(config.getAllowedMethods()).contains("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS");
    }

    @Test
    @DisplayName("CORS allowlist filters out wildcard and null origins")
    void cors_filtersWildcardAndNullOrigins() {
        CorsConfigurationSource source = corsConfig.corsConfigurationSource("*, null, https://yuding.travel , ");

        MockServerHttpRequest request = MockServerHttpRequest.get("/apir/reservations/me")
                .header("Origin", "https://yuding.travel")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        CorsConfiguration config = source.getCorsConfiguration(exchange);
        assertThat(config).isNotNull();
        // Wildcard '*' and 'null' should have been stripped
        assertThat(config.getAllowedOrigins()).containsExactly("https://yuding.travel");
        assertThat(config.getAllowedOrigins()).doesNotContain("*", "null", "");
    }

    @Test
    @DisplayName("CORS rejects unknown origin by not matching allowed origins")
    void cors_rejectsUnknownOrigin() {
        CorsConfigurationSource source = corsConfig.corsConfigurationSource("https://yuding.travel");

        MockServerHttpRequest request = MockServerHttpRequest.get("/auth/login")
                .header("Origin", "https://malicious-attacker.com")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        CorsConfiguration config = source.getCorsConfiguration(exchange);
        assertThat(config).isNotNull();
        assertThat(config.checkOrigin("https://malicious-attacker.com")).isNull();
        assertThat(config.checkOrigin("https://yuding.travel")).isEqualTo("https://yuding.travel");
    }

    @Test
    @DisplayName("CORS with empty origins does not allow any origin")
    void cors_emptyOriginsConfigured_allowsNothing() {
        CorsConfigurationSource source = corsConfig.corsConfigurationSource("");

        MockServerHttpRequest request = MockServerHttpRequest.get("/auth/login")
                .header("Origin", "http://localhost:3000")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        CorsConfiguration config = source.getCorsConfiguration(exchange);
        assertThat(config).isNotNull();
        assertThat(config.getAllowedOrigins()).isNullOrEmpty();
        assertThat(config.checkOrigin("http://localhost:3000")).isNull();
    }

    @Test
    @DisplayName("Preflight OPTIONS validates allowed methods and headers")
    void cors_optionsPreflightValidation() {
        CorsConfigurationSource source = corsConfig.corsConfigurationSource("https://staging.yuding.travel");

        MockServerHttpRequest request = MockServerHttpRequest.options("/admin/users")
                .header("Origin", "https://staging.yuding.travel")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "Authorization, Content-Type, X-Correlation-Id")
                .build();
        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        CorsConfiguration config = source.getCorsConfiguration(exchange);
        assertThat(config).isNotNull();
        assertThat(config.checkOrigin("https://staging.yuding.travel")).isEqualTo("https://staging.yuding.travel");
        assertThat(config.checkHttpMethod(org.springframework.http.HttpMethod.POST)).contains(org.springframework.http.HttpMethod.POST);
        assertThat(config.checkHeaders(List.of("Authorization", "Content-Type", "X-Correlation-Id"))).contains("Authorization", "Content-Type", "X-Correlation-Id");
    }
}
