package com.ahmed.gatewayservice.filter;

import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import reactor.core.publisher.Mono;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.List;

/**
 * Gateway perimeter JWT validation, anti-spoofing header sanitization, and identity propagation filter.
 * 1. Strips all incoming client-supplied identity headers (X-User-*) to eliminate spoofing.
 * 2. If Authorization Bearer token is provided, cryptographically validates RS256 signature and expiration.
 * 3. Enriches downstream request with verified X-User-* headers only from trusted JWT claims.
 */
@Component
public class JwtAuthenticationGatewayFilter implements GlobalFilter, Ordered {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationGatewayFilter.class);

    private static final List<String> SPOOFED_HEADERS_TO_STRIP = List.of(
            "X-User-Id", "X-User-Email", "X-User-Roles", "X-User-Name", "X-User-Country"
    );

    @Value("${jwt.public-key-location:classpath:certs/public.pem}")
    private Resource publicKeyResource;

    private RSAPublicKey rsaPublicKey;

    @PostConstruct
    public void init() {
        try (InputStream is = publicKeyResource.getInputStream()) {
            String pem = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            String clean = pem
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] decoded = Base64.getDecoder().decode(clean);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            this.rsaPublicKey = (RSAPublicKey) keyFactory.generatePublic(new X509EncodedKeySpec(decoded));
            log.info("Gateway JWT Filter: RSA public key successfully loaded.");
        } catch (Exception e) {
            log.warn("Gateway JWT Filter: Could not load RSA public key: {}", e.getMessage());
        }
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // Step 1: Strip any client-supplied spoofed identity headers
        ServerHttpRequest.Builder requestBuilder = exchange.getRequest().mutate()
                .headers(httpHeaders -> {
                    for (String header : SPOOFED_HEADERS_TO_STRIP) {
                        httpHeaders.remove(header);
                    }
                });

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        // If no Bearer token, proceed with stripped/clean request
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return chain.filter(exchange.mutate().request(requestBuilder.build()).build());
        }

        String token = authHeader.substring(7).trim();

        try {
            SignedJWT signedJWT = SignedJWT.parse(token);

            if (rsaPublicKey != null) {
                RSASSAVerifier verifier = new RSASSAVerifier(rsaPublicKey);
                if (!signedJWT.verify(verifier)) {
                    log.warn("Gateway: Rejected request to {} due to invalid JWT signature",
                            exchange.getRequest().getURI().getPath());
                    return writeError(exchange, HttpStatus.UNAUTHORIZED, "Invalid JWT signature");
                }
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            Date expirationTime = claims.getExpirationTime();
            if (expirationTime != null && new Date().after(expirationTime)) {
                log.warn("Gateway: Rejected request to {} due to expired JWT token",
                        exchange.getRequest().getURI().getPath());
                return writeError(exchange, HttpStatus.UNAUTHORIZED, "JWT access token has expired");
            }

            String userId = claims.getSubject();
            String email = (String) claims.getClaim("email");
            Object rolesClaim = claims.getClaim("roles");
            String rolesStr = "";
            if (rolesClaim instanceof List<?> list) {
                rolesStr = String.join(",", list.stream().map(Object::toString).toList());
            } else if (rolesClaim != null) {
                rolesStr = rolesClaim.toString();
            }

            // Step 2: Inject verified claims from validated JWT only
            if (userId != null && !userId.isBlank()) {
                requestBuilder.header("X-User-Id", userId);
            }
            if (email != null && !email.isBlank()) {
                requestBuilder.header("X-User-Email", email);
            }
            if (!rolesStr.isEmpty()) {
                requestBuilder.header("X-User-Roles", rolesStr);
            }

            return chain.filter(exchange.mutate().request(requestBuilder.build()).build());

        } catch (Exception e) {
            log.warn("Gateway: Failed to parse/validate JWT token: {}", e.getMessage());
            return writeError(exchange, HttpStatus.UNAUTHORIZED, "Malformed or invalid JWT access token");
        }
    }

    private Mono<Void> writeError(ServerWebExchange exchange, HttpStatus status, String message) {
        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = String.format("{\"error\":\"%s\",\"message\":\"%s\",\"status\":%d}",
                status.getReasonPhrase(), message, status.value());
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        return exchange.getResponse().writeWith(Mono.just(exchange.getResponse().bufferFactory().wrap(bytes)));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
