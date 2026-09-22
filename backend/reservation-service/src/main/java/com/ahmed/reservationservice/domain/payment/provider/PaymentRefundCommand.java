package com.ahmed.reservationservice.domain.payment.provider;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Command to execute a provider-level refund for a captured payment.
 */
@Getter
@Builder
public class PaymentRefundCommand {
    private final String captureId;
    private final String paymentReference;
    private final BigDecimal amount;
    private final String currency;
    private final String reason;
    private final String providerRequestId;
}
