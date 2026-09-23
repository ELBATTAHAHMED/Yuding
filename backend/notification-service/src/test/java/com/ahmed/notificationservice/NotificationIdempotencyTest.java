package com.ahmed.notificationservice;

import com.ahmed.notificationservice.domain.dto.NotificationEventRequest;
import com.ahmed.notificationservice.domain.dto.NotificationResponse;
import com.ahmed.notificationservice.domain.model.NotificationEventType;
import com.ahmed.notificationservice.domain.model.NotificationStatus;
import com.ahmed.notificationservice.domain.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.profiles.active=test")
@ActiveProfiles("test")
@Transactional
public class NotificationIdempotencyTest {

    @Autowired
    private NotificationService notificationService;

    @Test
    @DisplayName("Should create new notification on first event and return existing on duplicate idempotency key")
    void shouldEnforceEventIdempotency() {
        UUID userId = UUID.randomUUID();
        String idempotencyKey = "VERIFY_ACCOUNT:" + userId + ":attempt-1";

        NotificationEventRequest firstRequest = NotificationEventRequest.builder()
                .eventType(NotificationEventType.VERIFY_ACCOUNT)
                .idempotencyKey(idempotencyKey)
                .recipientEmail("traveler@example.com")
                .recipientUserId(userId)
                .parameters(Map.of("verificationLink", "http://localhost:3000/verify-email?token=tok-1"))
                .build();

        NotificationResponse firstResponse = notificationService.recordEvent(firstRequest);

        assertThat(firstResponse.getNotificationReference()).startsWith("NTF-");
        assertThat(firstResponse.getStatus()).isEqualTo(NotificationStatus.PENDING);
        assertThat(firstResponse.isDuplicateReplayed()).isFalse();

        // Second identical request
        NotificationEventRequest duplicateRequest = NotificationEventRequest.builder()
                .eventType(NotificationEventType.VERIFY_ACCOUNT)
                .idempotencyKey(idempotencyKey)
                .recipientEmail("traveler@example.com")
                .recipientUserId(userId)
                .parameters(Map.of("verificationLink", "http://localhost:3000/verify-email?token=tok-1"))
                .build();

        NotificationResponse duplicateResponse = notificationService.recordEvent(duplicateRequest);

        assertThat(duplicateResponse.getNotificationReference()).isEqualTo(firstResponse.getNotificationReference());
        assertThat(duplicateResponse.isDuplicateReplayed()).isTrue();
    }

    @Test
    @DisplayName("Should generate distinct notification references for distinct idempotency keys")
    void shouldGenerateDistinctRecordsForDistinctKeys() {
        NotificationEventRequest req1 = NotificationEventRequest.builder()
                .eventType(NotificationEventType.BOOKING_CANCELLED)
                .idempotencyKey("BOOKING_CANCELLED:YUD-11111111:v1")
                .recipientEmail("user1@example.com")
                .bookingReference("YUD-11111111")
                .build();

        NotificationEventRequest req2 = NotificationEventRequest.builder()
                .eventType(NotificationEventType.BOOKING_CANCELLED)
                .idempotencyKey("BOOKING_CANCELLED:YUD-22222222:v1")
                .recipientEmail("user2@example.com")
                .bookingReference("YUD-22222222")
                .build();

        NotificationResponse resp1 = notificationService.recordEvent(req1);
        NotificationResponse resp2 = notificationService.recordEvent(req2);

        assertThat(resp1.getNotificationReference()).isNotEqualTo(resp2.getNotificationReference());
        assertThat(resp1.isDuplicateReplayed()).isFalse();
        assertThat(resp2.isDuplicateReplayed()).isFalse();
    }
}
