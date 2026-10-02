package com.ahmed.reservationservice.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Durable, single-operation ledger for provider cancellation and refund. */
@Entity
@Table(name = "cancellation_requests", schema = "booking")
@Getter
@Setter
public class CancellationRequest {
    @Id
    private UUID id;
    @Column(name = "booking_id", nullable = false, unique = true)
    private UUID bookingId;
    @Column(name = "requested_by", nullable = false)
    private UUID requestedBy;
    private String reason;
    private String status;
    @Column(name = "policy_type")
    private String policyType;
    @Column(name = "policy_source")
    private String policySource;
    @Column(name = "policy_reason")
    private String policyReason;
    @Column(name = "policy_deadline")
    private Instant policyDeadline;
    @Column(name = "provider_name")
    private String providerName;
    @Column(name = "provider_cancellation_reference")
    private String providerCancellationReference;
    @Column(name = "provider_status")
    private String providerStatus;
    @Column(name = "failure_message")
    private String failureMessage;
    @Column(name = "refund_status")
    private String refundStatus;
    @Column(name = "refund_amount", precision = 12, scale = 2)
    private BigDecimal refundAmount;
    @Column(name = "cancellation_fee", precision = 12, scale = 2)
    private BigDecimal cancellationFee;
    private String currency;
    @Column(name = "requested_at")
    private Instant requestedAt;
    @Column(name = "processed_at")
    private Instant processedAt;
    @Column(name = "refunded_at")
    private Instant refundedAt;
    @Version
    private Integer version;
}
