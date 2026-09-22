package com.ahmed.reservationservice.domain.payment.provider;

import lombok.Builder;
import lombok.Getter;

/**
 * Result of capturing a payment order with a provider.
 */
@Getter
@Builder
public class PaymentCaptureResult {
    private final boolean success;
    private final String providerTransactionId;
    private final String status;
    private final String errorMessage;

    public static PaymentCaptureResult success(String providerTransactionId, String status) {
        return PaymentCaptureResult.builder()
                .success(true)
                .providerTransactionId(providerTransactionId)
                .status(status)
                .build();
    }

    public static PaymentCaptureResult failure(String errorMessage) {
        return PaymentCaptureResult.builder()
                .success(false)
                .status("FAILED")
                .errorMessage(errorMessage)
                .build();
    }
}
