package com.ahmed.reservationservice.domain.payment.provider;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Command to capture an approved payment order.
 */
@Getter
@Builder
public class PaymentCaptureCommand {
    private final String providerOrderId;
    private final String paymentReference;
    private final BigDecimal amount;
    private final String currency;
    private final String providerRequestId;
}
