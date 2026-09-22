package com.ahmed.reservationservice.domain.idempotency;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

/**
 * Persistent idempotency record in schema booking.
 * Enforces single-execution semantics per (actor_user_id, operation, idempotency_key_hash).
 */
@Entity
@Table(name = "idempotency_records", schema = "booking")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class IdempotencyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "operation", nullable = false, length = 50)
    private String operation;

    @Column(name = "resource_scope", length = 100)
    private String resourceScope;

    @Column(name = "idempotency_key_hash", nullable = false, length = 64)
    private String idempotencyKeyHash;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private IdempotencyStatus status;

    @Column(name = "resource_type", length = 50)
    private String resourceType;

    @Column(name = "resource_reference", length = 100)
    private String resourceReference;

    @Column(name = "http_status")
    private Integer httpStatus;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_payload", columnDefinition = "jsonb")
    private String responsePayload;

    @Column(name = "response_hash", length = 64)
    private String responseHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 0;

    public void markCompleted(int httpStatus, String responsePayload, String responseHash, String resourceReference, Instant now) {
        this.status = IdempotencyStatus.COMPLETED;
        this.httpStatus = httpStatus;
        this.responsePayload = responsePayload;
        this.responseHash = responseHash;
        this.resourceReference = resourceReference;
        this.completedAt = now;
    }

    public void markFailed(IdempotencyStatus failureStatus, int httpStatus, String errorMessage, Instant now) {
        this.status = failureStatus;
        this.httpStatus = httpStatus;
        this.responsePayload = errorMessage;
        this.completedAt = now;
    }
}
