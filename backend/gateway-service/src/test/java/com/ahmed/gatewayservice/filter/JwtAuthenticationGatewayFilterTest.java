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
    void signedRolesAreEnforcedForAdminReadsAndWrites() throws Exception {
        var generator=java.security.KeyPairGenerator.getInstance("RSA");generator.initialize(2048);
        var pair=generator.generateKeyPair();
        ReflectionTestUtils.setField(filter,"rsaPublicKey",pair.getPublic());
        for(String role:java.util.List.of("ROLE_USER","ROLE_CONTENT_MANAGER","ROLE_SUPPORT","ROLE_ADMIN")) {
            var claims=new com.nimbusds.jwt.JWTClaimsSet.Builder().subject(java.util.UUID.randomUUID().toString())
                    .expirationTime(new java.util.Date(System.currentTimeMillis()+60000)).claim("roles",java.util.List.of(role)).build();
            var token=new com.nimbusds.jwt.SignedJWT(new com.nimbusds.jose.JWSHeader(com.nimbusds.jose.JWSAlgorithm.RS256),claims);
            token.sign(new com.nimbusds.jose.crypto.RSASSASigner(pair.getPrivate()));
            boolean reader=role.equals("ROLE_ADMIN")||role.equals("ROLE_SUPPORT");
            for(boolean write:java.util.List.of(false,true)) {
                var builder=write?MockServerHttpRequest.post("/apir/admin/cancellations/00000000-0000-0000-0000-000000000001/retry-refund"):MockServerHttpRequest.get("/apir/admin/dossiers");
                var exchange=MockServerWebExchange.from(builder.header("Authorization","Bearer "+token.serialize()).build());
                var invoked=new java.util.concurrent.atomic.AtomicBoolean(false);
                filter.filter(exchange,ex->{invoked.set(true);return Mono.empty();}).block();
                boolean allowed=reader&&(!write||role.equals("ROLE_ADMIN"));
                assertThat(invoked.get()).as(role+" write="+write).isEqualTo(allowed);
                if(!allowed)assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
            }
        }
    }

    @Test
    void adminRoutesRejectAnonymousRequestsBeforeDownstream() {
        for(String path:java.util.List.of("/admin/users/page","/apir/admin/dossiers","/apir/admin/ledger","/apic/reviews/moderation/page")) {
            var exchange=MockServerWebExchange.from(MockServerHttpRequest.get(path).header("X-User-Roles","ROLE_ADMIN").build());
            var invoked=new java.util.concurrent.atomic.AtomicBoolean(false);
            filter.filter(exchange,ex->{invoked.set(true);return Mono.empty();}).block();
            assertThat(invoked).isFalse();assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        }
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

    @Test
    void reviewWritesAndMineRequireAuthenticationAtGateway() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/apic/reviews/mine").build());
        AtomicReference<Boolean> chainInvoked = new AtomicReference<>(false);
        filter.filter(exchange, ex -> {
            chainInvoked.set(true);
            return Mono.empty();
        }).block();
        assertThat(chainInvoked.get()).isFalse();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void publicReviewsRemainReadableWithoutAuthentication() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/apic/reviews/public/featured").build());
        AtomicReference<Boolean> chainInvoked = new AtomicReference<>(false);
        filter.filter(exchange, ex -> {
            chainInvoked.set(true);
            return Mono.empty();
        }).block();
        assertThat(chainInvoked.get()).isTrue();
    }
}
