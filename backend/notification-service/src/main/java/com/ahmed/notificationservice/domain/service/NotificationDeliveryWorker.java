package com.ahmed.notificationservice.domain.service;

import com.ahmed.notificationservice.config.NotificationProperties;
import com.ahmed.notificationservice.domain.model.DeliveryAttempt;
import com.ahmed.notificationservice.domain.model.DeliveryAttemptStatus;
import com.ahmed.notificationservice.domain.model.Notification;
import com.ahmed.notificationservice.domain.model.NotificationStatus;
import com.ahmed.notificationservice.domain.provider.EmailMessage;
import com.ahmed.notificationservice.domain.provider.EmailProvider;
import com.ahmed.notificationservice.domain.provider.EmailProviderRegistry;
import com.ahmed.notificationservice.domain.provider.EmailSendResult;
import com.ahmed.notificationservice.domain.repository.DeliveryAttemptRepository;
import com.ahmed.notificationservice.domain.repository.NotificationRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Component
@RequiredArgsConstructor
public class NotificationDeliveryWorker {

    private static final Logger log = LoggerFactory.getLogger(NotificationDeliveryWorker.class);

    private final NotificationRepository notificationRepository;
    private final DeliveryAttemptRepository deliveryAttemptRepository;
    private final EmailProviderRegistry providerRegistry;
    private final TemplateRenderer templateRenderer;
    private final NotificationProperties properties;
    private final ObjectMapper objectMapper;
    private final PlatformTransactionManager transactionManager;

    @Scheduled(fixedDelayString = "${yuding.notification.worker-fixed-delay-ms:2000}")
    public void scheduledProcess() {
        if (!properties.isWorkerEnabled()) {
            return;
        }
        processPendingNotifications();
    }

    public void processPendingNotifications() {
        List<UUID> claimedIds = claimDueNotificationIds();
        if (claimedIds.isEmpty()) {
            return;
        }

        for (UUID notificationId : claimedIds) {
            try {
                processSingleNotification(notificationId);
            } catch (Exception ex) {
                log.error("NotificationDeliveryWorker: Unhandled failure processing notification ID [{}]: {}",
                        notificationId, ex.getMessage(), ex);
            }
        }
    }

    @Scheduled(fixedRate = 60000)
    public void scheduledRecoverStale() {
        if (!properties.isWorkerEnabled()) {
            return;
        }
        recoverStaleProcessing();
    }

    public void recoverStaleProcessing() {
        Instant threshold = Instant.now().minus(Duration.ofMinutes(properties.getStaleProcessingTimeoutMinutes()));
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> {
            List<Notification> staleList = notificationRepository.findStaleProcessing(NotificationStatus.PROCESSING, threshold);
            for (Notification n : staleList) {
                log.warn("NotificationDeliveryWorker: Recovering stale PROCESSING notification [{}] last attempted at {}",
                        n.getNotificationReference(), n.getLastAttemptAt());
                n.setStatus(NotificationStatus.RETRY_SCHEDULED);
                n.setNextAttemptAt(Instant.now());
                notificationRepository.save(n);
            }
        });
    }

    private List<UUID> claimDueNotificationIds() {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        return tx.execute(status -> {
            List<UUID> ids = notificationRepository.claimDueNotificationIds(Instant.now(), 20);
            if (ids.isEmpty()) {
                return Collections.emptyList();
            }

            for (UUID id : ids) {
                notificationRepository.findById(id).ifPresent(n -> {
                    n.setStatus(NotificationStatus.PROCESSING);
                    n.setLastAttemptAt(Instant.now());
                    notificationRepository.save(n);
                });
            }
            return ids;
        });
    }

    private void processSingleNotification(UUID notificationId) {
        // Step 1: Read notification data within a short read transaction
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        Notification notification = tx.execute(status -> notificationRepository.findById(notificationId).orElse(null));

        if (notification == null || notification.getStatus() != NotificationStatus.PROCESSING) {
            return;
        }

        // Step 2: Render email & dispatch outside database transaction
        Map<String, Object> parameters = deserializePayload(notification.getContentPayload());
        String htmlBody;
        String textBody;
        try {
            htmlBody = templateRenderer.renderHtml(notification.getTemplateName(), parameters);
            textBody = templateRenderer.renderText(notification.getTemplateName(), parameters);
        } catch (Exception e) {
            log.error("NotificationDeliveryWorker: Template rendering failed for [{}]: {}",
                    notification.getNotificationReference(), e.getMessage());
            finalizeFailure(notificationId, "TEMPLATE_RENDER_ERROR", e.getMessage(), false);
            return;
        }

        String recipientName = (String) parameters.getOrDefault("recipientName", "voyageur");
        EmailMessage message = EmailMessage.builder()
                .recipientEmail(notification.getRecipientEmail())
                .recipientName(recipientName)
                .subject(notification.getSubject())
                .htmlBody(htmlBody)
                .textBody(textBody)
                .notificationReference(notification.getNotificationReference())
                .build();

        EmailProvider provider = providerRegistry.getActiveProvider();
        EmailSendResult result = provider.send(message);

        // Step 3: Record outcome & update notification state in separate transaction
        tx.executeWithoutResult(status -> {
            Notification n = notificationRepository.findById(notificationId).orElse(null);
            if (n == null) return;

            int newAttemptCount = n.getAttemptCount() + 1;
            n.setAttemptCount(newAttemptCount);
            n.setLastAttemptAt(Instant.now());

            if (result.isSuccess()) {
                n.setStatus(NotificationStatus.SENT);
                n.setSentAt(Instant.now());
                n.setNextAttemptAt(null);
                n.setProviderMessageId(result.getProviderMessageId());

                DeliveryAttempt attempt = DeliveryAttempt.builder()
                        .notificationId(n.getId())
                        .attemptNumber(newAttemptCount)
                        .providerName(provider.getProviderName())
                        .providerMessageId(result.getProviderMessageId())
                        .status(DeliveryAttemptStatus.SUCCESS)
                        .build();
                deliveryAttemptRepository.save(attempt);

                log.info("NotificationDeliveryWorker: Successfully dispatched notification [{}] via [{}]",
                        n.getNotificationReference(), provider.getProviderName());

            } else {
                boolean canRetry = result.isRetryable() && newAttemptCount < n.getMaxAttempts();

                if (canRetry) {
                    n.setStatus(NotificationStatus.RETRY_SCHEDULED);
                    Duration backoff = calculateBackoff(newAttemptCount);
                    n.setNextAttemptAt(Instant.now().plus(backoff));
                    n.setLastErrorCode(result.getErrorCode());

                    DeliveryAttempt attempt = DeliveryAttempt.builder()
                        .notificationId(n.getId())
                        .attemptNumber(newAttemptCount)
                        .providerName(provider.getProviderName())
                        .status(DeliveryAttemptStatus.TEMPORARY_FAILURE)
                        .errorMessage(result.getErrorMessage())
                        .build();
                    deliveryAttemptRepository.save(attempt);

                    log.warn("NotificationDeliveryWorker: Notification [{}] transient failure (attempt {}/{}), retrying in {}s: {}",
                            n.getNotificationReference(), newAttemptCount, n.getMaxAttempts(),
                            backoff.toSeconds(), result.getErrorMessage());

                } else {
                    n.setStatus(NotificationStatus.FAILED_PERMANENT);
                    n.setNextAttemptAt(null);
                    n.setLastErrorCode(result.getErrorCode());

                    DeliveryAttempt attempt = DeliveryAttempt.builder()
                        .notificationId(n.getId())
                        .attemptNumber(newAttemptCount)
                        .providerName(provider.getProviderName())
                        .status(DeliveryAttemptStatus.PERMANENT_FAILURE)
                        .errorMessage(result.getErrorMessage())
                        .build();
                    deliveryAttemptRepository.save(attempt);

                    log.error("NotificationDeliveryWorker: Notification [{}] permanently failed: {}",
                            n.getNotificationReference(), result.getErrorMessage());
                }
            }

            notificationRepository.save(n);
        });
    }

    private void finalizeFailure(UUID notificationId, String errorCode, String errorMessage, boolean retryable) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(status -> {
            Notification n = notificationRepository.findById(notificationId).orElse(null);
            if (n == null) return;

            int newAttemptCount = n.getAttemptCount() + 1;
            n.setAttemptCount(newAttemptCount);
            n.setLastAttemptAt(Instant.now());
            n.setStatus(retryable && newAttemptCount < n.getMaxAttempts()
                    ? NotificationStatus.RETRY_SCHEDULED
                    : NotificationStatus.FAILED_PERMANENT);
            n.setLastErrorCode(errorCode);

            DeliveryAttempt attempt = DeliveryAttempt.builder()
                    .notificationId(n.getId())
                    .attemptNumber(newAttemptCount)
                    .providerName("internal")
                    .status(retryable ? DeliveryAttemptStatus.TEMPORARY_FAILURE : DeliveryAttemptStatus.PERMANENT_FAILURE)
                    .errorMessage(errorMessage)
                    .build();
            deliveryAttemptRepository.save(attempt);
            notificationRepository.save(n);
        });
    }

    public Duration calculateBackoff(int attemptCount) {
        return switch (attemptCount) {
            case 1 -> Duration.ofMinutes(1);
            case 2 -> Duration.ofMinutes(5);
            case 3 -> Duration.ofMinutes(15);
            default -> Duration.ofHours(1);
        };
    }

    private Map<String, Object> deserializePayload(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(payloadJson, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Failed to deserialize payload: {}", e.getMessage());
            return new HashMap<>();
        }
    }
}
