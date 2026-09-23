package com.ahmed.notificationservice.domain.service;

import com.ahmed.notificationservice.config.NotificationProperties;
import com.ahmed.notificationservice.domain.dto.NotificationEventRequest;
import com.ahmed.notificationservice.domain.dto.NotificationResponse;
import com.ahmed.notificationservice.domain.model.Notification;
import com.ahmed.notificationservice.domain.model.NotificationChannel;
import com.ahmed.notificationservice.domain.model.NotificationEventType;
import com.ahmed.notificationservice.domain.model.NotificationReferenceGenerator;
import com.ahmed.notificationservice.domain.model.NotificationStatus;
import com.ahmed.notificationservice.domain.repository.NotificationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final TemplateRenderer templateRenderer;
    private final NotificationProperties properties;
    private final ObjectMapper objectMapper;

    @Transactional
    public NotificationResponse recordEvent(NotificationEventRequest request) {
        String keyHash = hashKey(request.getIdempotencyKey());

        // 1. Check existing record by (eventType, idempotencyKeyHash) for idempotency
        Optional<Notification> existing = notificationRepository
                .findByEventTypeAndIdempotencyKeyHash(request.getEventType(), keyHash);

        if (existing.isPresent()) {
            Notification n = existing.get();
            log.info("NotificationService: Idempotent duplicate event acknowledged for type [{}] keyHash [{}], existing ref [{}]",
                    request.getEventType(), keyHash, n.getNotificationReference());
            return toResponse(n, true);
        }

        // 2. Allocate canonical notification reference
        String reference = allocateReference();

        // 3. Resolve template name and parameters
        String templateName = resolveTemplateName(request.getEventType());
        Map<String, Object> params = request.getParameters() != null
                ? new HashMap<>(request.getParameters())
                : new HashMap<>();

        // Add standard context variables
        params.putIfAbsent("recipientEmail", request.getRecipientEmail());
        params.putIfAbsent("recipientName", request.getRecipientName() != null ? request.getRecipientName() : "voyageur");
        if (request.getBookingReference() != null) {
            params.putIfAbsent("bookingReference", request.getBookingReference());
            params.putIfAbsent("dossierLink", properties.getFrontendBaseUrl() + "/bookings/" + request.getBookingReference());
        }
        if (request.getPaymentReference() != null) {
            params.putIfAbsent("paymentReference", request.getPaymentReference());
        }

        String subject = templateRenderer.resolveSubject(request.getEventType(), params);
        String payloadJson = serializePayload(params);

        Notification notification = Notification.builder()
                .notificationReference(reference)
                .eventType(request.getEventType())
                .channel(NotificationChannel.EMAIL)
                .recipientEmail(request.getRecipientEmail().toLowerCase().trim())
                .recipientUserId(request.getRecipientUserId())
                .bookingReference(request.getBookingReference())
                .paymentReference(request.getPaymentReference())
                .templateName(templateName)
                .templateVersion("v1")
                .status(NotificationStatus.PENDING)
                .attemptCount(0)
                .maxAttempts(properties.getMaxAttempts())
                .nextAttemptAt(Instant.now())
                .idempotencyKeyHash(keyHash)
                .subject(subject)
                .contentPayload(payloadJson)
                .build();

        try {
            notification = notificationRepository.saveAndFlush(notification);
            log.info("NotificationService: Recorded durable notification [{}] type [{}] for [{}]",
                    reference, request.getEventType(), maskEmail(request.getRecipientEmail()));
            return toResponse(notification, false);

        } catch (DataIntegrityViolationException ex) {
            // Concurrency catch: if duplicate arrived at exact same millisecond
            log.warn("NotificationService: DataIntegrityViolation on save, falling back to existing idempotency lookup: {}", ex.getMessage());
            return notificationRepository
                    .findByEventTypeAndIdempotencyKeyHash(request.getEventType(), keyHash)
                    .map(n -> toResponse(n, true))
                    .orElseThrow(() -> ex);
        }
    }

    @Transactional(readOnly = true)
    public Optional<NotificationResponse> getNotificationByReference(String reference) {
        return notificationRepository.findByNotificationReference(reference)
                .map(n -> toResponse(n, false));
    }

    private String allocateReference() {
        for (int i = 0; i < 10; i++) {
            String candidate = NotificationReferenceGenerator.generate();
            if (!notificationRepository.existsByNotificationReference(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to allocate unique notification reference");
    }

    private String resolveTemplateName(NotificationEventType type) {
        return switch (type) {
            case VERIFY_ACCOUNT -> "verify-account";
            case RESET_PASSWORD -> "reset-password";
            case PAYMENT_FAILED -> "payment-failed";
            case BOOKING_CONFIRMED -> "booking-confirmed";
            case BOOKING_CANCELLED -> "booking-cancelled";
            case REFUND_COMPLETED -> "refund-completed";
        };
    }

    private String hashKey(String idempotencyKey) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(idempotencyKey.trim().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not supported", e);
        }
    }

    private String serializePayload(Map<String, Object> params) {
        try {
            return objectMapper.writeValueAsString(params);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize content payload: {}", e.getMessage());
            return "{}";
        }
    }

    private NotificationResponse toResponse(Notification n, boolean duplicateReplayed) {
        return NotificationResponse.builder()
                .notificationReference(n.getNotificationReference())
                .eventType(n.getEventType())
                .channel(n.getChannel())
                .recipientEmail(n.getRecipientEmail())
                .status(n.getStatus())
                .attemptCount(n.getAttemptCount())
                .createdAt(n.getCreatedAt())
                .sentAt(n.getSentAt())
                .duplicateReplayed(duplicateReplayed)
                .build();
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int atIdx = email.indexOf('@');
        String prefix = email.substring(0, Math.min(2, atIdx));
        return prefix + "***" + email.substring(atIdx);
    }
}
