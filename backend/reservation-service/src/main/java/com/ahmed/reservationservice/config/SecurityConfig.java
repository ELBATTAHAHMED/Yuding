package com.ahmed.reservationservice.config;

import com.ahmed.reservationservice.DTO.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;

/**
 * Service-level Spring Security configuration for Reservation Service (Booking & Travel inventory domain).
 * Enforces defense-in-depth: independently verifies RS256 JWT signatures and enforces RBAC/ownership.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter grantedAuthoritiesConverter = new JwtGrantedAuthoritiesConverter();
        grantedAuthoritiesConverter.setAuthoritiesClaimName("roles");
        grantedAuthoritiesConverter.setAuthorityPrefix(""); // Roles already include ROLE_ prefix

        JwtAuthenticationConverter jwtAuthenticationConverter = new JwtAuthenticationConverter();
        jwtAuthenticationConverter.setJwtGrantedAuthoritiesConverter(grantedAuthoritiesConverter);
        return jwtAuthenticationConverter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                        .contentTypeOptions(contentType -> {})
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives("default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"))
                        .referrerPolicy(ref -> ref
                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                        .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "camera=(), microphone=(), geolocation=()"))
                )
                .authorizeHttpRequests(auth -> auth
                        // Public infrastructure endpoints
                        .requestMatchers("/actuator/health/**", "/actuator/info", "/actuator/prometheus").permitAll()

                        // Public travel catalog read endpoints
                        .requestMatchers(HttpMethod.GET, "/apir/hebergements/**", "/apir/transports/**", "/apir/activities/**").permitAll()

                        // Admin dashboard
                        .requestMatchers("/apir/admin/**").hasAnyRole("ADMIN", "SUPPORT")

                        // Inventory write operations: Content Manager or Admin
                        .requestMatchers(HttpMethod.POST, "/apir/hebergements/**", "/apir/transports/**", "/apir/activities/**").hasAnyRole("ADMIN", "CONTENT_MANAGER")
                        .requestMatchers(HttpMethod.PUT, "/apir/hebergements/**", "/apir/transports/**", "/apir/activities/**").hasAnyRole("ADMIN", "CONTENT_MANAGER")
                        .requestMatchers(HttpMethod.DELETE, "/apir/hebergements/**", "/apir/transports/**", "/apir/activities/**").hasAnyRole("ADMIN", "CONTENT_MANAGER")

                        // Reservations & Payments require authentication
                        .requestMatchers("/apir/reservations/**", "/apir/paiements/**").authenticated()

                        .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ErrorResponse err = ErrorResponse.of(
                                    request.getHeader("X-Request-Id"),
                                    HttpStatus.UNAUTHORIZED.value(),
                                    "Unauthorized",
                                    "Full authentication is required to access this resource",
                                    request.getRequestURI()
                            );
                            response.getWriter().write(objectMapper.writeValueAsString(err));
                        })
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ErrorResponse err = ErrorResponse.of(
                                    request.getHeader("X-Request-Id"),
                                    HttpStatus.UNAUTHORIZED.value(),
                                    "Unauthorized",
                                    authException.getMessage(),
                                    request.getRequestURI()
                            );
                            response.getWriter().write(objectMapper.writeValueAsString(err));
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpStatus.FORBIDDEN.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            ErrorResponse err = ErrorResponse.of(
                                    request.getHeader("X-Request-Id"),
                                    HttpStatus.FORBIDDEN.value(),
                                    "Forbidden",
                                    "Access is denied: insufficient role privileges",
                                    request.getRequestURI()
                            );
                            response.getWriter().write(objectMapper.writeValueAsString(err));
                        })
                )
                .build();
    }
}
