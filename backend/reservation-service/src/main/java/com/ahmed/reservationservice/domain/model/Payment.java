package com.ahmed.reservationservice.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Server-authoritative persistent entity recording payments.
 * Strictly encapsulates payment reference (PAY-XXXXXXXX), provider order/transaction IDs,
 * authoritative amount/currency binding, and lifecycle statuses.
 */
@Entity
@Table(name = "payments", schema = "payment")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_id", nullable = false, updatable = false)
    private UUID bookingId;

    @Column(name = "payment_reference", nullable = false, unique = true, length = 32, updatable = false)
    private String paymentReference;

    @Column(name = "pricing_quote_id", updatable = false)
    private UUID pricingQuoteId;

    @Column(name = "provider_name", nullable = false, length = 50, updatable = false)
    private String providerName;

    @Column(name = "provider_order_id", length = 255)
    private String providerOrderId;

    @Column(name = "provider_transaction_id", length = 255, unique = true)
    private String providerTransactionId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3, updatable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private PaymentStatus status;

    @Column(name = "payment_method_type", length = 32)
    private String paymentMethodType;

    @Column(name = "client_token", length = 255)
    private String clientToken;

    @Column(name = "approval_url")
    private String approvalUrl;

    @Column(name = "error_message")
    private String errorMessage;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public void markSucceeded(String captureId, Instant now) {
        this.status = PaymentStatus.SUCCEEDED;
        this.providerTransactionId = captureId;
        this.errorMessage = null;
        this.updatedAt = now != null ? now : Instant.now();
    }

    public void markFailed(String errorReason, Instant now) {
        this.status = PaymentStatus.FAILED;
        this.errorMessage = errorReason;
        this.updatedAt = now != null ? now : Instant.now();
    }
}
