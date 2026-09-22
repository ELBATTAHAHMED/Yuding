package com.ahmed.reservationservice.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Immutable audit ledger of incoming payment provider webhook events.
 * Persisted in PostgreSQL schema payment.
 */
@Entity
@Table(name = "webhook_events", schema = "payment")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class WebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "provider", nullable = false, length = 64, updatable = false)
    private String provider;

    @Column(name = "provider_event_id", nullable = false, length = 255, updatable = false)
    private String providerEventId;

    @Column(name = "event_type", nullable = false, length = 100, updatable = false)
    private String eventType;

    @Column(name = "provider_resource_id", length = 255)
    private String providerResourceId;

    @Column(name = "provider_order_id", length = 255)
    private String providerOrderId;

    @Column(name = "payment_id")
    private UUID paymentId;

    @Column(name = "signature_verified", nullable = false)
    private boolean signatureVerified;

    @Enumerated(EnumType.STRING)
    @Column(name = "processing_status", nullable = false, length = 32)
    private WebhookProcessingStatus processingStatus;

    @CreationTimestamp
    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    @Column(name = "processed_at")
    private Instant processedAt;

    @Column(name = "payload_hash", nullable = false, length = 64, updatable = false)
    private String payloadHash;

    @Column(name = "failure_reason")
    private String failureReason;

    public void markProcessed(Instant now) {
        this.processingStatus = WebhookProcessingStatus.PROCESSED;
        this.processedAt = now != null ? now : Instant.now();
        this.failureReason = null;
    }

    public void markFailed(String reason, Instant now) {
        this.processingStatus = WebhookProcessingStatus.FAILED;
        this.processedAt = now != null ? now : Instant.now();
        this.failureReason = reason;
    }

    public void markUnmatched(String reason, Instant now) {
        this.processingStatus = WebhookProcessingStatus.UNMATCHED;
        this.processedAt = now != null ? now : Instant.now();
        this.failureReason = reason;
    }

    public void markIgnored(String reason, Instant now) {
        this.processingStatus = WebhookProcessingStatus.IGNORED;
        this.processedAt = now != null ? now : Instant.now();
        this.failureReason = reason;
    }

    public void markDuplicate(Instant now) {
        this.processingStatus = WebhookProcessingStatus.DUPLICATE;
        this.processedAt = now != null ? now : Instant.now();
    }
}
