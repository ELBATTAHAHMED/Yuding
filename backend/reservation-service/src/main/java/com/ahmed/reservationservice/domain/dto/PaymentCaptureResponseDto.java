package com.ahmed.reservationservice.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Public DTO representing the outcome of payment capture.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCaptureResponseDto {
    private String bookingReference;
    private String paymentReference;
    private String providerTransactionId;
    private String paymentStatus;
    private String bookingStatus;
    private BigDecimal amount;
    private String currency;
    private String message;
}
