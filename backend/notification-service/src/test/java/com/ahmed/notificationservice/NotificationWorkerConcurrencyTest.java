package com.ahmed.notificationservice;

import com.ahmed.notificationservice.domain.dto.NotificationEventRequest;
import com.ahmed.notificationservice.domain.dto.NotificationResponse;
import com.ahmed.notificationservice.domain.model.DeliveryAttempt;
import com.ahmed.notificationservice.domain.model.DeliveryAttemptStatus;
import com.ahmed.notificationservice.domain.model.Notification;
import com.ahmed.notificationservice.domain.model.NotificationEventType;
import com.ahmed.notificationservice.domain.model.NotificationStatus;
import com.ahmed.notificationservice.domain.provider.mock.MockEmailProvider;
import com.ahmed.notificationservice.domain.repository.DeliveryAttemptRepository;
import com.ahmed.notificationservice.domain.repository.NotificationRepository;
import com.ahmed.notificationservice.domain.service.NotificationDeliveryWorker;
import com.ahmed.notificationservice.domain.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.profiles.active=test")
@ActiveProfiles("test")
public class NotificationWorkerConcurrencyTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationDeliveryWorker deliveryWorker;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private DeliveryAttemptRepository deliveryAttemptRepository;

    @Autowired
    private MockEmailProvider mockEmailProvider;

    @BeforeEach
    void setUp() {
        mockEmailProvider.clear();
        deliveryAttemptRepository.deleteAll();
        notificationRepository.deleteAll();
    }

    @Test
    @DisplayName("Should claim PENDING notification, dispatch email via MockProvider, and transition to SENT")
    void shouldProcessPendingNotificationSuccessfully() {
        NotificationEventRequest request = NotificationEventRequest.builder()
                .eventType(NotificationEventType.VERIFY_ACCOUNT)
                .idempotencyKey("VERIFY_ACCOUNT:" + UUID.randomUUID())
                .recipientEmail("user@example.com")
                .parameters(Map.of("verificationLink", "http://localhost:3000/verify-email?token=xyz"))
                .build();

        NotificationResponse response = notificationService.recordEvent(request);

        // Run worker processing
        deliveryWorker.processPendingNotifications();

        Notification updated = notificationRepository.findByNotificationReference(response.getNotificationReference()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(updated.getAttemptCount()).isEqualTo(1);
        assertThat(updated.getSentAt()).isNotNull();
        assertThat(updated.getProviderMessageId()).startsWith("MOCK-MSG-");

        List<DeliveryAttempt> attempts = deliveryAttemptRepository.findByNotificationIdOrderByAttemptNumberAsc(updated.getId());
        assertThat(attempts).hasSize(1);
        assertThat(attempts.get(0).getStatus()).isEqualTo(DeliveryAttemptStatus.SUCCESS);
        assertThat(attempts.get(0).getProviderName()).isEqualTo("mock");

        assertThat(mockEmailProvider.getSentMessages()).hasSize(1);
        assertThat(mockEmailProvider.getSentMessages().get(0).getRecipientEmail()).isEqualTo("user@example.com");
    }

    @Test
    @DisplayName("Should handle transient failure with bounded exponential retry, eventually succeeding on attempt 3")
    void shouldRetryTransientFailuresAndEventuallySucceed() {
        mockEmailProvider.simulateTransientFailures(2); // Fail first 2 attempts

        NotificationEventRequest request = NotificationEventRequest.builder()
                .eventType(NotificationEventType.RESET_PASSWORD)
                .idempotencyKey("RESET_PASSWORD:" + UUID.randomUUID())
                .recipientEmail("retry@example.com")
                .parameters(Map.of("resetLink", "http://localhost:3000/reset-password?token=rst"))
                .build();

        NotificationResponse response = notificationService.recordEvent(request);

        // Attempt 1: Fails transiently
        deliveryWorker.processPendingNotifications();

        Notification afterAttempt1 = notificationRepository.findByNotificationReference(response.getNotificationReference()).orElseThrow();
        assertThat(afterAttempt1.getStatus()).isEqualTo(NotificationStatus.RETRY_SCHEDULED);
        assertThat(afterAttempt1.getAttemptCount()).isEqualTo(1);
        assertThat(afterAttempt1.getNextAttemptAt()).isAfter(Instant.now());

        // Fast-forward nextAttemptAt for Attempt 2
        afterAttempt1.setNextAttemptAt(Instant.now().minusSeconds(1));
        notificationRepository.save(afterAttempt1);

        // Attempt 2: Fails transiently
        deliveryWorker.processPendingNotifications();

        Notification afterAttempt2 = notificationRepository.findByNotificationReference(response.getNotificationReference()).orElseThrow();
        assertThat(afterAttempt2.getStatus()).isEqualTo(NotificationStatus.RETRY_SCHEDULED);
        assertThat(afterAttempt2.getAttemptCount()).isEqualTo(2);

        // Fast-forward nextAttemptAt for Attempt 3
        afterAttempt2.setNextAttemptAt(Instant.now().minusSeconds(1));
        notificationRepository.save(afterAttempt2);

        // Attempt 3: Succeeds
        deliveryWorker.processPendingNotifications();

        Notification afterAttempt3 = notificationRepository.findByNotificationReference(response.getNotificationReference()).orElseThrow();
        assertThat(afterAttempt3.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(afterAttempt3.getAttemptCount()).isEqualTo(3);
        assertThat(afterAttempt3.getSentAt()).isNotNull();

        List<DeliveryAttempt> attempts = deliveryAttemptRepository.findByNotificationIdOrderByAttemptNumberAsc(afterAttempt3.getId());
        assertThat(attempts).hasSize(3);
        assertThat(attempts.get(0).getStatus()).isEqualTo(DeliveryAttemptStatus.TEMPORARY_FAILURE);
        assertThat(attempts.get(1).getStatus()).isEqualTo(DeliveryAttemptStatus.TEMPORARY_FAILURE);
        assertThat(attempts.get(2).getStatus()).isEqualTo(DeliveryAttemptStatus.SUCCESS);
    }

    @Test
    @DisplayName("Should classify permanent failure and transition immediately to FAILED_PERMANENT")
    void shouldTransitionToFailedPermanentOnNonRetryableError() {
        mockEmailProvider.simulatePermanentFailure(true);

        NotificationEventRequest request = NotificationEventRequest.builder()
                .eventType(NotificationEventType.PAYMENT_FAILED)
                .idempotencyKey("PAYMENT_FAILED:" + UUID.randomUUID())
                .recipientEmail("permanent-fail@example.com")
                .bookingReference("YUD-PERM1234")
                .build();

        NotificationResponse response = notificationService.recordEvent(request);

        deliveryWorker.processPendingNotifications();

        Notification updated = notificationRepository.findByNotificationReference(response.getNotificationReference()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(NotificationStatus.FAILED_PERMANENT);
        assertThat(updated.getAttemptCount()).isEqualTo(1);
        assertThat(updated.getNextAttemptAt()).isNull();

        List<DeliveryAttempt> attempts = deliveryAttemptRepository.findByNotificationIdOrderByAttemptNumberAsc(updated.getId());
        assertThat(attempts).hasSize(1);
        assertThat(attempts.get(0).getStatus()).isEqualTo(DeliveryAttemptStatus.PERMANENT_FAILURE);
    }

    @Test
    @DisplayName("Should recover stale PROCESSING lease after crash or timeout")
    void shouldRecoverStaleProcessingLease() {
        Notification notification = Notification.builder()
                .notificationReference("NTF-STALE001")
                .eventType(NotificationEventType.BOOKING_CONFIRMED)
                .channel(com.ahmed.notificationservice.domain.model.NotificationChannel.EMAIL)
                .recipientEmail("stale@example.com")
                .bookingReference("YUD-STALE999")
                .templateName("booking-confirmed")
                .templateVersion("v1")
                .status(NotificationStatus.PROCESSING)
                .attemptCount(1)
                .maxAttempts(5)
                .lastAttemptAt(Instant.now().minus(10, ChronoUnit.MINUTES)) // 10 minutes ago (> 5m timeout)
                .idempotencyKeyHash("stale_hash_123")
                .contentPayload("{}")
                .build();

        notificationRepository.save(notification);

        deliveryWorker.recoverStaleProcessing();

        Notification recovered = notificationRepository.findByNotificationReference("NTF-STALE001").orElseThrow();
        assertThat(recovered.getStatus()).isEqualTo(NotificationStatus.RETRY_SCHEDULED);
        assertThat(recovered.getNextAttemptAt()).isNotNull();
    }
}
