package com.ahmed.notificationservice.domain.dto;

import com.ahmed.notificationservice.domain.model.NotificationChannel;
import com.ahmed.notificationservice.domain.model.NotificationEventType;
import com.ahmed.notificationservice.domain.model.NotificationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private String notificationReference;
    private NotificationEventType eventType;
    private NotificationChannel channel;
    private String recipientEmail;
    private NotificationStatus status;
    private int attemptCount;
    private Instant createdAt;
    private Instant sentAt;
    private boolean duplicateReplayed;
}
