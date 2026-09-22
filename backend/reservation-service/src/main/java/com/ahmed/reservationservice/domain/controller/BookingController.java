package com.ahmed.reservationservice.domain.controller;

import com.ahmed.reservationservice.config.SecurityUtils;
import com.ahmed.reservationservice.domain.dto.BookingResponseDto;
import com.ahmed.reservationservice.domain.dto.CreateDraftBookingRequest;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for Booking domain.
 * Public endpoints exclusively operate with public booking references (YUD-XXXXXXXX).
 */
@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingController {

    private final BookingService bookingService;

    /**
     * Creates a new DRAFT booking for the currently authenticated user.
     * Generates a unique public booking reference (YUD-XXXXXXXX) server-side.
     */
    @PostMapping
    public ResponseEntity<BookingResponseDto> createDraft(
            @RequestBody @Valid CreateDraftBookingRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        log.info("Received request to create DRAFT booking for user {} (product: {})", userId, request.getProductType());

        Booking booking = bookingService.createDraft(userId, request.getProductType());
        URI location = URI.create("/bookings/" + booking.getBookingReference());
        return ResponseEntity.created(location).body(BookingResponseDto.fromDomain(booking));
    }

    /**
     * Retrieves a booking by its public reference (YUD-XXXXXXXX).
     * Enforces ownership validation against authenticated user identity.
     */
    @GetMapping("/{reference}")
    public ResponseEntity<BookingResponseDto> getBookingByReference(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        boolean privileged = SecurityUtils.hasRole("ADMIN") || SecurityUtils.hasRole("SUPPORT");

        Booking booking = bookingService.getBookingByReference(reference, userId, privileged);
        return ResponseEntity.ok(BookingResponseDto.fromDomain(booking));
    }

    /**
     * Lists all bookings belonging to the currently authenticated user.
     */
    @GetMapping("/me")
    public ResponseEntity<List<BookingResponseDto>> getMyBookings(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = resolveUserUuid(jwt);
        List<BookingResponseDto> response = bookingService.getUserBookings(userId).stream()
                .map(BookingResponseDto::fromDomain)
                .toList();
        return ResponseEntity.ok(response);
    }

    /**
     * Lists all bookings belonging to the currently authenticated user (convenience alias).
     */
    @GetMapping
    public ResponseEntity<List<BookingResponseDto>> getBookings(@AuthenticationPrincipal Jwt jwt) {
        return getMyBookings(jwt);
    }

    /**
     * Cancels an existing booking using its public reference (YUD-XXXXXXXX).
     */
    @PostMapping("/{reference}/cancel")
    public ResponseEntity<BookingResponseDto> cancelBooking(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        boolean privileged = SecurityUtils.hasRole("ADMIN") || SecurityUtils.hasRole("SUPPORT");

        Booking booking = bookingService.cancelByReference(reference, userId, privileged);
        return ResponseEntity.ok(BookingResponseDto.fromDomain(booking));
    }

    private UUID resolveUserUuid(Jwt jwt) {
        if (jwt == null) {
            throw new AccessDeniedException("Authentication required: token missing or invalid");
        }
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException e) {
            throw new AccessDeniedException("Invalid user identity in token: subject is not a valid UUID");
        }
    }
}
