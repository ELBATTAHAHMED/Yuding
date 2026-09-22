package com.ahmed.reservationservice.domain.payment.webhook;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Dedicated inbound webhook controller for PayPal Sandbox payment notifications.
 * Exempt from user JWT authentication; secured via cryptographic signature verification.
 */
@RestController
@RequestMapping("/webhooks")
@Slf4j
public class PaymentWebhookController {

    private final PayPalWebhookSignatureVerifier signatureVerifier;
    private final PaymentWebhookService paymentWebhookService;

    public PaymentWebhookController(
            PayPalWebhookSignatureVerifier signatureVerifier,
            PaymentWebhookService paymentWebhookService) {
        this.signatureVerifier = signatureVerifier;
        this.paymentWebhookService = paymentWebhookService;
    }

    @PostMapping(value = "/paypal", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, String>> handlePayPalWebhook(
            @RequestHeader HttpHeaders headers,
            @RequestBody String rawBody) {

        String transmissionId = headers.getFirst(PayPalWebhookSignatureVerifier.HEADER_TRANSMISSION_ID);
        log.info("PaymentWebhookController: Inbound PayPal webhook received (transmissionId={})",
                transmissionId != null ? transmissionId : "NONE");

        // 1. Verify cryptographic signature via official PayPal API
        boolean verified = signatureVerifier.verifySignature(headers, rawBody);
        if (!verified) {
            log.warn("PaymentWebhookController: Webhook signature verification rejected for transmissionId [{}]",
                    transmissionId != null ? transmissionId : "NONE");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("status", "REJECTED", "message", "Invalid or missing webhook signature"));
        }

        // 2. Process and reconcile payment event
        PaymentWebhookService.WebhookProcessingResult result = paymentWebhookService.processVerifiedWebhook("paypal-sandbox", rawBody);

        log.info("PaymentWebhookController: Webhook processed with result [{}] for event [{}]",
                result.getStatus(), result.getEventId());

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "processingStatus", result.getStatus().name()
        ));
    }
}
