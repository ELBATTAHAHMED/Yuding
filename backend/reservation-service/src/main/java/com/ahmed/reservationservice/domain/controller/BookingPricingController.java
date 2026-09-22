package com.ahmed.reservationservice.domain.controller;

import com.ahmed.reservationservice.config.SecurityUtils;
import com.ahmed.reservationservice.domain.dto.BookingPricingResponseDto;
import com.ahmed.reservationservice.domain.service.BookingPricingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for server-authoritative booking pricing.
 * Enforces authenticated ownership and accepts zero client authority over monetary prices.
 */
@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingPricingController {

    private final BookingPricingService pricingService;

    /**
     * Establishes server-authoritative pricing for a Booking based on its latest fresh revalidation.
     * Requires no request body; all monetary facts and calculations are strictly derived server-side.
     */
    @PostMapping("/{reference}/pricing")
    public ResponseEntity<BookingPricingResponseDto> createAuthoritativePricing(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = resolveUserId(jwt);
        List<String> roles = resolveRoles(jwt);

        log.info("Received request to price booking [{}] by user [{}]", reference, userId);
        BookingPricingResponseDto response = pricingService.createAuthoritativePricing(reference, userId, roles);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves the latest server-authoritative pricing quote for a Booking.
     */
    @GetMapping("/{reference}/pricing")
    public ResponseEntity<BookingPricingResponseDto> getLatestPricing(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = resolveUserId(jwt);
        List<String> roles = resolveRoles(jwt);

        log.info("Received request to fetch pricing for booking [{}] by user [{}]", reference, userId);
        BookingPricingResponseDto response = pricingService.getLatestPricing(reference, userId, roles);
        return ResponseEntity.ok(response);
    }

    private String resolveUserId(Jwt jwt) {
        if (jwt == null || jwt.getSubject() == null) {
            throw new AccessDeniedException("Authentication required: token missing or invalid");
        }
        return jwt.getSubject();
    }

    private List<String> resolveRoles(Jwt jwt) {
        if (jwt != null && jwt.hasClaim("roles")) {
            List<String> r = jwt.getClaimAsStringList("roles");
            if (r != null) return r;
        }
        if (SecurityUtils.hasRole("ADMIN")) {
            return List.of("ROLE_ADMIN");
        }
        if (SecurityUtils.hasRole("SUPPORT")) {
            return List.of("ROLE_SUPPORT");
        }
        return List.of("ROLE_USER");
    }
}
