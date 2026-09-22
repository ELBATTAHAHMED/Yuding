package com.ahmed.reservationservice.domain.controller;

import com.ahmed.reservationservice.config.SecurityUtils;
import com.ahmed.reservationservice.domain.dto.PaymentCaptureRequestDto;
import com.ahmed.reservationservice.domain.dto.PaymentCaptureResponseDto;
import com.ahmed.reservationservice.domain.dto.PaymentDetailsDto;
import com.ahmed.reservationservice.domain.dto.PaymentOrderResponseDto;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyOperation;
import com.ahmed.reservationservice.domain.idempotency.IdempotencyService;
import com.ahmed.reservationservice.domain.service.PaymentService;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * REST controller for payment orchestration (Phase 38).
 * Enforces authenticated ownership, RS256 JWT, and server-authoritative pricing.
 */
@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final IdempotencyService idempotencyService;

    /**
     * Initiates a payment order with the active provider.
     * The payable amount and currency strictly originate from Phase 37 ServerPricingQuote.
     * Protected by Idempotency-Key header.
     */
    @PostMapping("/{reference}/payment/create-order")
    public ResponseEntity<PaymentOrderResponseDto> createPaymentOrder(
            @PathVariable String reference,
            @RequestParam(required = false) String returnUrl,
            @RequestParam(required = false) String cancelUrl,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = resolveUserId(jwt);
        UUID userUuid = UUID.fromString(userId);
        List<String> roles = resolveRoles(jwt);

        Map<String, String> payload = new TreeMap<>();
        if (returnUrl != null) payload.put("returnUrl", returnUrl);
        if (cancelUrl != null) payload.put("cancelUrl", cancelUrl);

        log.info("Received payment order initiation request for booking [{}] by user [{}]", reference, userId);
        PaymentOrderResponseDto response = idempotencyService.execute(
                IdempotencyOperation.PAYMENT_CREATE,
                userUuid,
                reference,
                idempotencyKey,
                payload,
                PaymentOrderResponseDto.class,
                () -> paymentService.initiatePaymentOrder(reference, returnUrl, cancelUrl, userId, roles),
                PaymentOrderResponseDto::getPaymentReference,
                HttpStatus.OK.value()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Captures an approved payment order and transitions the Booking to PAID.
     * Protected by Idempotency-Key header.
     */
    @PostMapping("/{reference}/payment/capture")
    public ResponseEntity<PaymentCaptureResponseDto> capturePayment(
            @PathVariable String reference,
            @RequestBody(required = false) PaymentCaptureRequestDto request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = resolveUserId(jwt);
        UUID userUuid = UUID.fromString(userId);
        List<String> roles = resolveRoles(jwt);

        log.info("Received payment capture request for booking [{}] by user [{}]", reference, userId);
        PaymentCaptureResponseDto response = idempotencyService.execute(
                IdempotencyOperation.PAYMENT_CAPTURE,
                userUuid,
                reference,
                idempotencyKey,
                request != null ? request : Collections.emptyMap(),
                PaymentCaptureResponseDto.class,
                () -> paymentService.capturePayment(reference, request, userId, roles),
                PaymentCaptureResponseDto::getPaymentReference,
                HttpStatus.OK.value()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves the latest payment state for a Booking.
     */
    @GetMapping("/{reference}/payment")
    public ResponseEntity<PaymentDetailsDto> getPaymentDetails(
            @PathVariable String reference,
            @AuthenticationPrincipal Jwt jwt) {

        String userId = resolveUserId(jwt);
        List<String> roles = resolveRoles(jwt);

        log.info("Received request to get payment details for booking [{}] by user [{}]", reference, userId);
        PaymentDetailsDto response = paymentService.getPaymentDetails(reference, userId, roles);
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
