package com.ahmed.reservationservice.domain.payment.provider;

import lombok.Builder;
import lombok.Getter;

/**
 * Result of a provider-level refund execution.
 */
@Getter
@Builder
public class PaymentRefundResult {
    private final boolean success;
    private final String providerRefundId;
    private final String status;
    private final String errorMessage;

    public static PaymentRefundResult success(String providerRefundId, String status) {
        return PaymentRefundResult.builder()
                .success(true)
                .providerRefundId(providerRefundId)
                .status(status)
                .build();
    }

    public static PaymentRefundResult failure(String errorMessage) {
        return PaymentRefundResult.builder()
                .success(false)
                .errorMessage(errorMessage)
                .build();
    }
}
