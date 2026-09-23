package com.ahmed.reservationservice.domain.controller;

import com.ahmed.reservationservice.config.SecurityUtils;
import com.ahmed.reservationservice.domain.dto.AttachOfferSnapshotRequest;
import com.ahmed.reservationservice.domain.dto.BookingResponseDto;
import com.ahmed.reservationservice.domain.dto.BookingConfirmationDto;
import com.ahmed.reservationservice.domain.dto.CreateDraftBookingRequest;
import com.ahmed.reservationservice.domain.dto.OfferSnapshotResponseDto;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyOperation;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyService;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.ahmed.reservationservice.domain.service.ConfirmationProjectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Optional;
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
    private final ConfirmationProjectionService confirmationProjectionService;
    private final IdempotencyService idempotencyService;

    /**
     * Creates a new DRAFT booking for the currently authenticated user.
     * Optionally attaches an offer snapshot atomically if selectionRef is provided.
     * Protected by Idempotency-Key header.
     */
    @PostMapping
    public ResponseEntity<BookingResponseDto> createDraft(
            @RequestBody @Valid CreateDraftBookingRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        log.info("Received request to create DRAFT booking for user {} (product: {}, selectionRef: {})",
                userId, request.getProductType(), request.getSelectionRef());

        BookingResponseDto response = idempotencyService.execute(
                IdempotencyOperation.BOOKING_CREATE,
                userId,
                null,
                idempotencyKey,
                request,
                BookingResponseDto.class,
                () -> {
                    Booking booking = bookingService.createDraft(userId, request.getProductType(), request.getSelectionRef());
                    Optional<OfferSnapshot> snapshot = bookingService.getSnapshotByBookingReference(booking.getBookingReference(), userId, false);
                    return BookingResponseDto.fromDomain(booking, snapshot.orElse(null));
                },
                BookingResponseDto::getBookingReference,
                HttpStatus.CREATED.value()
        );

        URI location = URI.create("/bookings/" + response.getBookingReference());
        return ResponseEntity.created(location).body(response);
    }

    /**
     * Attaches an immutable offer snapshot to an existing DRAFT booking.
     */
    @PostMapping("/{reference}/offer-snapshot")
    public ResponseEntity<OfferSnapshotResponseDto> attachOfferSnapshot(
            @PathVariable String reference,
            @RequestBody @Valid AttachOfferSnapshotRequest request,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        boolean privileged = SecurityUtils.hasRole("ADMIN") || SecurityUtils.hasRole("SUPPORT");

        log.info("Received request to attach offer snapshot [{}] to booking [{}] for user {}",
                request.getSelectionRef(), reference, userId);

        OfferSnapshot snapshot = bookingService.attachOfferSnapshot(reference, request.getSelectionRef(), userId, privileged);
        return ResponseEntity.ok(OfferSnapshotResponseDto.fromDomain(snapshot));
    }

    /**
     * Retrieves a booking by its public reference (YUD-XXXXXXXX) along with its offer snapshot.
     * Enforces ownership validation against authenticated user identity.
     */
    @GetMapping("/{reference}")
    public ResponseEntity<BookingResponseDto> getBookingByReference(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        boolean privileged = SecurityUtils.hasRole("ADMIN") || SecurityUtils.hasRole("SUPPORT");

        Booking booking = bookingService.getBookingByReference(reference, userId, privileged);
        Optional<OfferSnapshot> snapshot = bookingService.getSnapshotByBookingReference(reference, userId, privileged);

        return ResponseEntity.ok(BookingResponseDto.fromDomain(booking, snapshot.orElse(null)));
    }

    /**
     * Returns the confirmation/receipt projection for an owned booking reference. This is read-only:
     * opening a confirmation URL cannot trigger payment capture or booking lifecycle changes.
     */
    @GetMapping("/{reference}/confirmation")
    public ResponseEntity<BookingConfirmationDto> getConfirmation(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        boolean privileged = SecurityUtils.hasRole("ADMIN") || SecurityUtils.hasRole("SUPPORT");
        return ResponseEntity.ok(confirmationProjectionService.getConfirmation(reference, userId, privileged));
    }

    /**
     * Retrieves the offer snapshot attached to a booking by public reference.
     */
    @GetMapping("/{reference}/offer-snapshot")
    public ResponseEntity<OfferSnapshotResponseDto> getOfferSnapshot(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        boolean privileged = SecurityUtils.hasRole("ADMIN") || SecurityUtils.hasRole("SUPPORT");

        return bookingService.getSnapshotByBookingReference(reference, userId, privileged)
                .map(snapshot -> ResponseEntity.ok(OfferSnapshotResponseDto.fromDomain(snapshot)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Lists all bookings belonging to the currently authenticated user.
     */
    @GetMapping("/me")
    public ResponseEntity<List<BookingResponseDto>> getMyBookings(@AuthenticationPrincipal Jwt jwt) {
        UUID userId = resolveUserUuid(jwt);
        List<BookingResponseDto> response = bookingService.getUserBookings(userId).stream()
                .map(booking -> {
                    Optional<OfferSnapshot> snap = bookingService.getSnapshotByBookingReference(booking.getBookingReference(), userId, false);
                    return BookingResponseDto.fromDomain(booking, snap.orElse(null));
                })
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
        Optional<OfferSnapshot> snapshot = bookingService.getSnapshotByBookingReference(reference, userId, privileged);
        return ResponseEntity.ok(BookingResponseDto.fromDomain(booking, snapshot.orElse(null)));
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
