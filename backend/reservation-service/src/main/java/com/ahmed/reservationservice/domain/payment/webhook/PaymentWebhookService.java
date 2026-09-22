package com.ahmed.reservationservice.domain.payment.webhook;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import com.ahmed.reservationservice.domain.model.WebhookEvent;
import com.ahmed.reservationservice.domain.model.WebhookProcessingStatus;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import com.ahmed.reservationservice.domain.repository.WebhookEventRepository;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Authoritative transactional handler for incoming payment webhooks.
 * Enforces cryptographic event deduplication, trusted Payment/Booking reconciliation,
 * ServerPricingQuote cross-checking, and state machine transition rules.
 */
@Service
@Slf4j
public class PaymentWebhookService {

    public static final String EVENT_CAPTURE_COMPLETED = "PAYMENT.CAPTURE.COMPLETED";
    public static final String EVENT_CAPTURE_PENDING = "PAYMENT.CAPTURE.PENDING";
    public static final String EVENT_CAPTURE_DENIED = "PAYMENT.CAPTURE.DENIED";

    private final WebhookEventRepository webhookEventRepository;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final ServerPricingQuoteRepository quoteRepository;
    private final BookingService bookingService;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    @Autowired
    public PaymentWebhookService(
            WebhookEventRepository webhookEventRepository,
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            ServerPricingQuoteRepository quoteRepository,
            BookingService bookingService) {
        this(webhookEventRepository, paymentRepository, bookingRepository, quoteRepository, bookingService, Clock.systemUTC());
    }

    public PaymentWebhookService(
            WebhookEventRepository webhookEventRepository,
            PaymentRepository paymentRepository,
            BookingRepository bookingRepository,
            ServerPricingQuoteRepository quoteRepository,
            BookingService bookingService,
            Clock clock) {
        this.webhookEventRepository = webhookEventRepository;
        this.paymentRepository = paymentRepository;
        this.bookingRepository = bookingRepository;
        this.quoteRepository = quoteRepository;
        this.bookingService = bookingService;
        this.clock = clock != null ? clock : Clock.systemUTC();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Processes an authenticated and signature-verified PayPal webhook payload.
     *
     * @param provider Provider identifier (e.g. "paypal-sandbox")
     * @param rawBody  Raw JSON string as received from the provider
     * @return Result containing status and diagnostic message
     */
    @Transactional
    public WebhookProcessingResult processVerifiedWebhook(String provider, String rawBody) {
        Instant now = Instant.now(clock);
        String payloadHash = computeSha256(rawBody);

        JsonNode root;
        try {
            root = objectMapper.readTree(rawBody);
        } catch (Exception e) {
            log.error("PaymentWebhookService: Malformed JSON received from provider [{}]: {}", provider, e.getMessage());
            return WebhookProcessingResult.failed("MALFORMED_JSON", "Unable to parse JSON body");
        }

        String eventId = root.path("id").asText();
        String eventType = root.path("event_type").asText();

        if (eventId == null || eventId.isBlank()) {
            log.warn("PaymentWebhookService: Webhook missing event ID from provider [{}]", provider);
            return WebhookProcessingResult.failed("MISSING_EVENT_ID", "Webhook payload missing id");
        }

        // 1. Deduplication check: Provider + EventId must be unique
        if (webhookEventRepository.existsByProviderAndProviderEventId(provider, eventId)) {
            log.info("PaymentWebhookService: Duplicate webhook event [provider={}, eventId={}] acknowledged (idempotent)",
                    provider, eventId);
            return WebhookProcessingResult.builder()
                    .provider(provider)
                    .eventId(eventId)
                    .eventType(eventType)
                    .status(WebhookProcessingStatus.DUPLICATE)
                    .message("Duplicate event acknowledged without mutation")
                    .build();
        }

        // Extract resource identifiers
        JsonNode resource = root.path("resource");
        String resourceId = resource.path("id").asText(null);
        String orderId = extractOrderId(resource);

        // 2. Correlate with trusted Payment entity
        Payment payment = resolvePayment(resourceId, orderId);
        if (payment == null) {
            log.warn("PaymentWebhookService: UNMATCHED payment webhook [provider={}, eventId={}, resourceId={}, orderId={}]",
                    provider, eventId, resourceId, orderId);

            WebhookEvent unmatchedEvent = WebhookEvent.builder()
                    .provider(provider)
                    .providerEventId(eventId)
                    .eventType(eventType)
                    .providerResourceId(resourceId)
                    .providerOrderId(orderId)
                    .signatureVerified(true)
                    .processingStatus(WebhookProcessingStatus.UNMATCHED)
                    .payloadHash(payloadHash)
                    .failureReason("No matching Payment found for resourceId=" + resourceId + " orderId=" + orderId)
                    .receivedAt(now)
                    .processedAt(now)
                    .build();
            webhookEventRepository.save(unmatchedEvent);

            return WebhookProcessingResult.builder()
                    .provider(provider)
                    .eventId(eventId)
                    .eventType(eventType)
                    .status(WebhookProcessingStatus.UNMATCHED)
                    .message("No matching Payment found for provider identifiers")
                    .build();
        }

        // 3. Reconcile Booking relationship
        Optional<Booking> bookingOpt = bookingRepository.findById(payment.getBookingId());
        if (bookingOpt.isEmpty()) {
            log.error("PaymentWebhookService: Payment [{}] refers to non-existent booking ID [{}]",
                    payment.getPaymentReference(), payment.getBookingId());

            WebhookEvent invalidEvent = WebhookEvent.builder()
                    .provider(provider)
                    .providerEventId(eventId)
                    .eventType(eventType)
                    .providerResourceId(resourceId)
                    .providerOrderId(orderId)
                    .paymentId(payment.getId())
                    .signatureVerified(true)
                    .processingStatus(WebhookProcessingStatus.FAILED)
                    .payloadHash(payloadHash)
                    .failureReason("Associated Booking not found for ID: " + payment.getBookingId())
                    .receivedAt(now)
                    .processedAt(now)
                    .build();
            webhookEventRepository.save(invalidEvent);

            return WebhookProcessingResult.failed(eventId, "Associated Booking not found");
        }
        Booking booking = bookingOpt.get();

        // 4. Amount and Currency Reconciliation
        String valueStr = resource.path("amount").path("value").asText(null);
        String currencyCode = resource.path("amount").path("currency_code").asText(null);

        if (valueStr != null && currencyCode != null) {
            try {
                BigDecimal webhookAmount = new BigDecimal(valueStr);
                if (payment.getAmount().compareTo(webhookAmount) != 0) {
                    log.error("PaymentWebhookService: AMOUNT MISMATCH for payment [{}]: expected [{}], webhook got [{}]",
                            payment.getPaymentReference(), payment.getAmount(), webhookAmount);

                    WebhookEvent mismatchEvent = WebhookEvent.builder()
                            .provider(provider)
                            .providerEventId(eventId)
                            .eventType(eventType)
                            .providerResourceId(resourceId)
                            .providerOrderId(orderId)
                            .paymentId(payment.getId())
                            .signatureVerified(true)
                            .processingStatus(WebhookProcessingStatus.FAILED)
                            .payloadHash(payloadHash)
                            .failureReason("AMOUNT_MISMATCH: expected " + payment.getAmount() + " but got " + webhookAmount)
                            .receivedAt(now)
                            .processedAt(now)
                            .build();
                    webhookEventRepository.save(mismatchEvent);

                    return WebhookProcessingResult.failed(eventId, "AMOUNT_MISMATCH");
                }

                if (!payment.getCurrency().equalsIgnoreCase(currencyCode)) {
                    log.error("PaymentWebhookService: CURRENCY MISMATCH for payment [{}]: expected [{}], webhook got [{}]",
                            payment.getPaymentReference(), payment.getCurrency(), currencyCode);

                    WebhookEvent mismatchEvent = WebhookEvent.builder()
                            .provider(provider)
                            .providerEventId(eventId)
                            .eventType(eventType)
                            .providerResourceId(resourceId)
                            .providerOrderId(orderId)
                            .paymentId(payment.getId())
                            .signatureVerified(true)
                            .processingStatus(WebhookProcessingStatus.FAILED)
                            .payloadHash(payloadHash)
                            .failureReason("CURRENCY_MISMATCH: expected " + payment.getCurrency() + " but got " + currencyCode)
                            .receivedAt(now)
                            .processedAt(now)
                            .build();
                    webhookEventRepository.save(mismatchEvent);

                    return WebhookProcessingResult.failed(eventId, "CURRENCY_MISMATCH");
                }

                // Cross-check ServerPricingQuote if bound
                if (payment.getPricingQuoteId() != null) {
                    Optional<ServerPricingQuote> quoteOpt = quoteRepository.findById(payment.getPricingQuoteId());
                    if (quoteOpt.isPresent()) {
                        ServerPricingQuote quote = quoteOpt.get();
                        if (quote.getTotalAmount().compareTo(webhookAmount) != 0 || !quote.getCurrency().equalsIgnoreCase(currencyCode)) {
                            log.error("PaymentWebhookService: Pricing quote mismatch for payment [{}]", payment.getPaymentReference());
                            return WebhookProcessingResult.failed(eventId, "SERVER_PRICING_QUOTE_MISMATCH");
                        }
                    }
                }
            } catch (NumberFormatException e) {
                log.error("PaymentWebhookService: Invalid numeric amount [{}] in webhook", valueStr);
                return WebhookProcessingResult.failed(eventId, "INVALID_AMOUNT_FORMAT");
            }
        }

        // 5. State Machine Dispatch based on Event Type
        WebhookProcessingStatus outcomeStatus;
        String failureReason = null;

        if (EVENT_CAPTURE_COMPLETED.equalsIgnoreCase(eventType)) {
            String resourceStatus = resource.path("status").asText("");
            if (!"COMPLETED".equalsIgnoreCase(resourceStatus)) {
                log.warn("PaymentWebhookService: PAYMENT.CAPTURE.COMPLETED event received with non-COMPLETED status [{}] for payment [{}]",
                        resourceStatus, payment.getPaymentReference());
                outcomeStatus = WebhookProcessingStatus.FAILED;
                failureReason = "Inconsistent capture status: " + resourceStatus;
            } else {
                // Out-of-order check: if already SUCCEEDED and booking PAID, treat as idempotent
                if (payment.getStatus() == PaymentStatus.SUCCEEDED && booking.getStatus() == BookingStatus.PAID) {
                    log.info("PaymentWebhookService: Payment [{}] and booking [{}] already in terminal PAID status",
                            payment.getPaymentReference(), booking.getBookingReference());
                    outcomeStatus = WebhookProcessingStatus.PROCESSED;
                } else {
                    // Update Payment to SUCCEEDED
                    payment.markSucceeded(resourceId != null ? resourceId : payment.getProviderTransactionId(), now);
                    paymentRepository.save(payment);

                    // Transition Booking to PAID
                    bookingService.markPaid(booking.getId());
                    log.info("PaymentWebhookService: Reconciled PAYMENT.CAPTURE.COMPLETED: Payment [{}] is SUCCEEDED, Booking [{}] is PAID.",
                            payment.getPaymentReference(), booking.getBookingReference());
                    outcomeStatus = WebhookProcessingStatus.PROCESSED;
                }
            }

        } else if (EVENT_CAPTURE_DENIED.equalsIgnoreCase(eventType)) {
            // Guard against stale out-of-order downgrade
            if (payment.getStatus() == PaymentStatus.SUCCEEDED || booking.getStatus() == BookingStatus.PAID) {
                log.warn("PaymentWebhookService: Ignoring late DENIED event for already SUCCEEDED payment [{}]",
                        payment.getPaymentReference());
                outcomeStatus = WebhookProcessingStatus.IGNORED;
                failureReason = "Ignored stale DENIED event for completed payment";
            } else {
                payment.markFailed("Webhook reported capture denied", now);
                paymentRepository.save(payment);
                bookingService.markPaymentFailed(booking.getId());
                log.info("PaymentWebhookService: Reconciled PAYMENT.CAPTURE.DENIED: Payment [{}] FAILED, Booking [{}] PAYMENT_FAILED.",
                        payment.getPaymentReference(), booking.getBookingReference());
                outcomeStatus = WebhookProcessingStatus.PROCESSED;
            }

        } else if (EVENT_CAPTURE_PENDING.equalsIgnoreCase(eventType)) {
            if (payment.getStatus() == PaymentStatus.SUCCEEDED || booking.getStatus() == BookingStatus.PAID) {
                log.warn("PaymentWebhookService: Ignoring late PENDING event for already SUCCEEDED payment [{}]",
                        payment.getPaymentReference());
                outcomeStatus = WebhookProcessingStatus.IGNORED;
                failureReason = "Ignored stale PENDING event for completed payment";
            } else {
                // Remains awaiting webhook, Booking remains PENDING_PAYMENT
                log.info("PaymentWebhookService: Reconciled PAYMENT.CAPTURE.PENDING for payment [{}]. Booking remains PENDING_PAYMENT.",
                        payment.getPaymentReference());
                outcomeStatus = WebhookProcessingStatus.PROCESSED;
            }

        } else {
            log.info("PaymentWebhookService: Received unhandled event_type [{}] for payment [{}]. Recording as IGNORED.",
                    eventType, payment.getPaymentReference());
            outcomeStatus = WebhookProcessingStatus.IGNORED;
            failureReason = "Unhandled event type: " + eventType;
        }

        // 6. Persist WebhookEvent Ledger Entry
        WebhookEvent event = WebhookEvent.builder()
                .provider(provider)
                .providerEventId(eventId)
                .eventType(eventType)
                .providerResourceId(resourceId)
                .providerOrderId(orderId)
                .paymentId(payment.getId())
                .signatureVerified(true)
                .processingStatus(outcomeStatus)
                .payloadHash(payloadHash)
                .failureReason(failureReason)
                .receivedAt(now)
                .processedAt(now)
                .build();
        webhookEventRepository.save(event);

        return WebhookProcessingResult.builder()
                .provider(provider)
                .eventId(eventId)
                .eventType(eventType)
                .paymentReference(payment.getPaymentReference())
                .bookingReference(booking.getBookingReference())
                .status(outcomeStatus)
                .message(failureReason != null ? failureReason : "Processed successfully")
                .build();
    }

    private Payment resolvePayment(String resourceId, String orderId) {
        if (resourceId != null && !resourceId.isBlank()) {
            Optional<Payment> byTx = paymentRepository.findByProviderTransactionId(resourceId);
            if (byTx.isPresent()) {
                return byTx.get();
            }
        }
        if (orderId != null && !orderId.isBlank()) {
            Optional<Payment> byOrder = paymentRepository.findByProviderOrderId(orderId);
            if (byOrder.isPresent()) {
                return byOrder.get();
            }
        }
        return null;
    }

    private String extractOrderId(JsonNode resource) {
        // Look in supplementary_data.related_ids.order_id
        JsonNode relatedIds = resource.path("supplementary_data").path("related_ids");
        if (!relatedIds.isMissingNode() && relatedIds.has("order_id")) {
            return relatedIds.path("order_id").asText();
        }
        // Look in parent_payment
        if (resource.has("parent_payment") && !resource.path("parent_payment").asText().isBlank()) {
            return resource.path("parent_payment").asText();
        }
        // Look in custom_id or invoice_id
        if (resource.has("custom_id") && !resource.path("custom_id").asText().isBlank()) {
            return resource.path("custom_id").asText();
        }
        return null;
    }

    private String computeSha256(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    @Getter
    @Builder
    public static class WebhookProcessingResult {
        private String provider;
        private String eventId;
        private String eventType;
        private String paymentReference;
        private String bookingReference;
        private WebhookProcessingStatus status;
        private String message;

        public static WebhookProcessingResult failed(String eventId, String message) {
            return WebhookProcessingResult.builder()
                    .eventId(eventId)
                    .status(WebhookProcessingStatus.FAILED)
                    .message(message)
                    .build();
        }
    }
}
