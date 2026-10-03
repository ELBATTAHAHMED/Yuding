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
public class AdminRefundDto {
    private UUID id;
    private UUID paymentId;
    private UUID bookingId;
    private String refundReference;
    private String providerRefundId;
    private BigDecimal amount;
    private String currency;
    private String reason;
    private String status;
    private UUID requestedBy;
    private Instant createdAt;
    private Instant updatedAt;
}
