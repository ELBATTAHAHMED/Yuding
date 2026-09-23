package com.ahmed.notificationservice.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications", schema = "notification")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "notification_reference", length = 12, nullable = false, unique = true)
    private String notificationReference;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", length = 64, nullable = false)
    private NotificationEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", length = 20, nullable = false)
    @Builder.Default
    private NotificationChannel channel = NotificationChannel.EMAIL;

    @Column(name = "recipient_email", length = 255, nullable = false)
    private String recipientEmail;

    @Column(name = "recipient_user_id")
    private UUID recipientUserId;

    @Column(name = "booking_reference", length = 32)
    private String bookingReference;

    @Column(name = "payment_reference", length = 32)
    private String paymentReference;

    @Column(name = "template_name", length = 64, nullable = false)
    private String templateName;

    @Column(name = "template_version", length = 16, nullable = false)
    @Builder.Default
    private String templateVersion = "v1";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 24, nullable = false)
    @Builder.Default
    private NotificationStatus status = NotificationStatus.PENDING;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "max_attempts", nullable = false)
    @Builder.Default
    private int maxAttempts = 5;

    @Column(name = "next_attempt_at")
    private Instant nextAttemptAt;

    @Column(name = "last_attempt_at")
    private Instant lastAttemptAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "idempotency_key_hash", length = 64, nullable = false)
    private String idempotencyKeyHash;

    @Column(name = "provider_message_id", length = 255)
    private String providerMessageId;

    @Column(name = "last_error_code", length = 64)
    private String lastErrorCode;

    @Column(name = "subject", length = 255)
    private String subject;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "content_payload", columnDefinition = "jsonb")
    private String contentPayload;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
