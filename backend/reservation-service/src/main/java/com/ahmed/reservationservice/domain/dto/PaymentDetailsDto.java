package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.Payment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Detailed DTO for payment status queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDetailsDto {
    private String paymentReference;
    private String bookingReference;
    private String providerName;
    private String providerOrderId;
    private String providerTransactionId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String approvalUrl;
    private String errorMessage;
    private Instant createdAt;
    private Instant updatedAt;

    public static PaymentDetailsDto fromEntity(Payment payment, String bookingReference) {
        if (payment == null) return null;
        return PaymentDetailsDto.builder()
                .paymentReference(payment.getPaymentReference())
                .bookingReference(bookingReference)
                .providerName(payment.getProviderName())
                .providerOrderId(payment.getProviderOrderId())
                .providerTransactionId(payment.getProviderTransactionId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .status(payment.getStatus() != null ? payment.getStatus().name() : null)
                .approvalUrl(payment.getApprovalUrl())
                .errorMessage(payment.getErrorMessage())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}
