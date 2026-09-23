package com.ahmed.gatewayservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.header.ReferrerPolicyServerHttpHeadersWriter;

import java.time.Duration;

/**
 * Spring Cloud Gateway Perimeter Security Configuration (Reactive / WebFlux).
 * Establishes defense-in-depth perimeter, disables CSRF for stateless APIs,
 * enforces strict security response headers, and routes traffic safely.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(
            ServerHttpSecurity http,
            org.springframework.web.cors.reactive.CorsConfigurationSource corsConfigurationSource) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives("default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"))
                        .frameOptions(frame -> frame
                                .mode(org.springframework.security.web.server.header.XFrameOptionsServerHttpHeadersWriter.Mode.DENY))
                        .referrerPolicy(ref -> ref
                                .policy(ReferrerPolicyServerHttpHeadersWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .permissionsPolicy(perm -> perm
                                .policy("camera=(), microphone=(), geolocation=(), payment=()"))
                        .hsts(hsts -> hsts
                                .includeSubdomains(true)
                                .maxAge(Duration.ofDays(365)))
                )
                .authorizeExchange(exchanges -> exchanges
                        // Public infrastructure & health probes
                        .pathMatchers("/actuator/health/**", "/actuator/info").permitAll()
                        // Downstream routed endpoints (services maintain their own authorization boundary)
                        .pathMatchers("/apir/**", "/auth/**", "/admin/**", "/apic/**", "/ai/**", "/api/ai/**", "/travel/**").permitAll()
                        .anyExchange().permitAll()
                )
                .build();
    }
}
