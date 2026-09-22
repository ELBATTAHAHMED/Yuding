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

import java.util.List;
import java.util.UUID;

/**
 * REST controller for Booking domain.
 * Strictly adheres to server-authoritative ownership and minimal safe public contract.
 */
@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@Slf4j
public class BookingController {

    private final BookingService bookingService;

    /**
     * Creates a new DRAFT booking for the currently authenticated user.
     */
    @PostMapping
    public ResponseEntity<BookingResponseDto> createDraft(
            @RequestBody @Valid CreateDraftBookingRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        log.info("Received request to create DRAFT booking for user {} (product: {})", userId, request.getProductType());

        Booking booking = bookingService.createDraft(userId, request.getProductType());
        return ResponseEntity.status(HttpStatus.CREATED).body(BookingResponseDto.fromDomain(booking));
    }

    /**
     * Retrieves a booking by its technical UUID.
     * Enforces ownership validation against authenticated user identity.
     */
    @GetMapping("/{id}")
    public ResponseEntity<BookingResponseDto> getBookingById(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        boolean privileged = SecurityUtils.hasRole("ADMIN") || SecurityUtils.hasRole("SUPPORT");

        Booking booking = bookingService.getBooking(id, userId, privileged);
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
     * Cancels an existing booking if the lifecycle state allows cancellation.
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<BookingResponseDto> cancelBooking(
            @PathVariable UUID id,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        boolean privileged = SecurityUtils.hasRole("ADMIN") || SecurityUtils.hasRole("SUPPORT");

        Booking booking = bookingService.cancel(id, userId, privileged);
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
