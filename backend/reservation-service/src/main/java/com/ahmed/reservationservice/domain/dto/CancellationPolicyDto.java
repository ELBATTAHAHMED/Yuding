package com.ahmed.reservationservice.domain.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record CancellationPolicyDto(
        String bookingReference, String bookingStatus, boolean cancellable,
        boolean refundable, String refundType, BigDecimal refundAmount,
        BigDecimal cancellationFee, String currency, String policySource,
        String reason, Instant deadline) { }
