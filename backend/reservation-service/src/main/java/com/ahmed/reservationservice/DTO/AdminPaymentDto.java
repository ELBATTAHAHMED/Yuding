package com.ahmed.reservationservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPaymentDto {
    private UUID id;
    private UUID bookingId;
    private String paymentReference;
    private String providerName;
    private String providerOrderId;
    private String providerTransactionId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String paymentMethodType;
    private String errorMessage;
    private Instant createdAt;
    private Instant updatedAt;
}
