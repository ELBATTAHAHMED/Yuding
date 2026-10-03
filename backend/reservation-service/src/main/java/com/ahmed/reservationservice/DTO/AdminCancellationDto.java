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
public class AdminCancellationDto {
    private UUID id;
    private UUID bookingId;
    private UUID requestedBy;
    private String reason;
    private String status;
    private String policyType;
    private String providerName;
    private String providerCancellationReference;
    private String refundStatus;
    private BigDecimal refundAmount;
    private BigDecimal cancellationFee;
    private String currency;
    private Instant requestedAt;
    private Instant processedAt;
    private Instant refundedAt;
}
