package com.ahmed.reservationservice.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Existing payment.refunds ledger, now used by cancellation orchestration. */
@Entity
@Table(name = "refunds", schema = "payment")
@Getter
@Setter
public class RefundRecord {
    @Id
    private UUID id;
    @Column(name = "payment_id")
    private UUID paymentId;
    @Column(name = "booking_id")
    private UUID bookingId;
    @Column(name = "refund_reference")
    private String refundReference;
    @Column(name = "provider_refund_id")
    private String providerRefundId;
    @Column(precision = 12, scale = 2)
    private BigDecimal amount;
    private String currency;
    private String reason;
    private String status;
    @Column(name = "requested_by")
    private UUID requestedBy;
    @Column(name = "created_at")
    private Instant createdAt;
    @Column(name = "updated_at")
    private Instant updatedAt;
}
