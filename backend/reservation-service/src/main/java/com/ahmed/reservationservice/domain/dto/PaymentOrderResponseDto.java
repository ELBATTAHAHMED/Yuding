package com.ahmed.reservationservice.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Public DTO representing the initiated payment order.
 * Exposes payment reference (PAY-XXXXXXXX) and provider checkout link (e.g. PayPal approval URL).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentOrderResponseDto {
    private String bookingReference;
    private String paymentReference;
    private String providerName;
    private String providerOrderId;
    private String approvalUrl;
    private BigDecimal amount;
    private String currency;
    private String status;
    private Instant createdAt;
}
