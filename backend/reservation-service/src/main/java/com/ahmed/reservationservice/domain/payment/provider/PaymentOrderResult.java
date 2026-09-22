package com.ahmed.reservationservice.domain.payment.provider;

import lombok.Builder;
import lombok.Getter;

/**
 * Result of creating a payment order with a provider.
 */
@Getter
@Builder
public class PaymentOrderResult {
    private final boolean success;
    private final String providerOrderId;
    private final String approvalUrl;
    private final String clientToken;
    private final String status;
    private final String errorMessage;

    public static PaymentOrderResult success(String providerOrderId, String approvalUrl, String clientToken, String status) {
        return PaymentOrderResult.builder()
                .success(true)
                .providerOrderId(providerOrderId)
                .approvalUrl(approvalUrl)
                .clientToken(clientToken)
                .status(status)
                .build();
    }

    public static PaymentOrderResult failure(String errorMessage) {
        return PaymentOrderResult.builder()
                .success(false)
                .status("FAILED")
                .errorMessage(errorMessage)
                .build();
    }
}
