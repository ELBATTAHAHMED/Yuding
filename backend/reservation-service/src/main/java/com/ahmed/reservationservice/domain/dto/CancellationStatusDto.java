package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.CancellationRequest;
import java.math.BigDecimal;
import java.time.Instant;

public record CancellationStatusDto(
        String bookingReference, String bookingStatus, String cancellationStatus,
        String refundStatus, String policyType, BigDecimal refundAmount,
        BigDecimal cancellationFee, String currency, String message,
        Instant requestedAt, Instant processedAt, Instant refundedAt) {

    public static CancellationStatusDto from(String reference, String bookingStatus, CancellationRequest request) {
        return new CancellationStatusDto(reference, bookingStatus, request.getStatus(),
                request.getRefundStatus(), request.getPolicyType(), request.getRefundAmount(),
                request.getCancellationFee(), request.getCurrency(),
                request.getFailureMessage() != null ? request.getFailureMessage() : request.getPolicyReason(),
                request.getRequestedAt(), request.getProcessedAt(), request.getRefundedAt());
    }
}
