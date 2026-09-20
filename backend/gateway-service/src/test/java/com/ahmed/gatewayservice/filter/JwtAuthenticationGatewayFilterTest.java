package com.ahmed.gatewayservice.filter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAuthenticationGatewayFilterTest {

    private JwtAuthenticationGatewayFilter filter;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationGatewayFilter();
        ReflectionTestUtils.setField(filter, "publicKeyResource", new ClassPathResource("certs/public.pem"));
        filter.init();
    }

    @Test
    @DisplayName("Filter explicitly strips spoofed client headers (X-User-*) when no Authorization header is present")
    void filter_stripsSpoofedHeaders_whenNoToken() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/apir/reservations/1")
                .header("X-User-Id", "999")
                .header("X-User-Roles", "ROLE_ADMIN")
                .header("X-User-Email", "attacker@spoof.com")
                .build();

        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<ServerWebExchange> capturedExchange = new AtomicReference<>();
        GatewayFilterChain chain = ex -> {
            capturedExchange.set(ex);
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertThat(capturedExchange.get()).isNotNull();
        HttpHeaders forwardedHeaders = capturedExchange.get().getRequest().getHeaders();
        assertThat(forwardedHeaders.getFirst("X-User-Id")).isNull();
        assertThat(forwardedHeaders.getFirst("X-User-Roles")).isNull();
        assertThat(forwardedHeaders.getFirst("X-User-Email")).isNull();
    }

    @Test
    @DisplayName("Filter immediately rejects malformed Bearer tokens with 401 Unauthorized")
    void filter_rejectsMalformedToken_with401() {
        MockServerHttpRequest request = MockServerHttpRequest.get("/apir/reservations/me")
                .header("Authorization", "Bearer invalid.malformed.token")
                .header("X-User-Id", "999")
                .build();

        MockServerWebExchange exchange = MockServerWebExchange.from(request);

        AtomicReference<Boolean> chainInvoked = new AtomicReference<>(false);
        GatewayFilterChain chain = ex -> {
            chainInvoked.set(true);
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        // Chain should NOT be called
        assertThat(chainInvoked.get()).isFalse();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
