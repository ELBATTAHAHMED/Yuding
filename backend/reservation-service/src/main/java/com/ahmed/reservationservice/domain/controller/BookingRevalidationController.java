package com.ahmed.reservationservice.domain.controller;

import com.ahmed.reservationservice.config.SecurityUtils;
import com.ahmed.reservationservice.domain.dto.BookingRevalidationResponseDto;
import com.ahmed.reservationservice.domain.service.BookingRevalidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for live offer revalidation and price-change acknowledgement.
 * Enforces authenticated ownership and uses public booking references (YUD-XXXXXXXX).
 */
@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingRevalidationController {

    private final BookingRevalidationService revalidationService;

    /**
     * Performs live read-only provider revalidation on the booking's immutable offer snapshot.
     * Bypasses search cache to retrieve current live availability and pricing.
     */
    @PostMapping("/{reference}/revalidate")
    public ResponseEntity<BookingRevalidationResponseDto> revalidateBooking(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = resolveUserId(jwt);
        List<String> roles = resolveRoles(jwt);

        log.info("Received request to revalidate booking [{}] by user [{}]", reference, userId);
        BookingRevalidationResponseDto response = revalidationService.revalidateBooking(reference, userId, roles);
        return ResponseEntity.ok(response);
    }

    /**
     * Acknowledges and accepts a changed price quote for the latest fresh revalidation.
     */
    @PostMapping("/{reference}/revalidation/accept-price-change")
    public ResponseEntity<BookingRevalidationResponseDto> acceptPriceChange(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = resolveUserId(jwt);
        List<String> roles = resolveRoles(jwt);

        log.info("Received request to accept price change for booking [{}] by user [{}]", reference, userId);
        BookingRevalidationResponseDto response = revalidationService.acceptPriceChange(reference, userId, roles);
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
