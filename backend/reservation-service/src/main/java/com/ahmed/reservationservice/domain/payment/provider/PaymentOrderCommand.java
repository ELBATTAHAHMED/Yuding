package com.ahmed.reservationservice.domain.payment.provider;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

/**
 * Command to create a provider payment order.
 * Amount and currency strictly originate from Phase 37 server-authoritative pricing.
 */
@Getter
@Builder
public class PaymentOrderCommand {
    private final String bookingReference;
    private final String paymentReference;
    private final BigDecimal amount;
    private final String currency;
    private final String description;
    private final String returnUrl;
    private final String cancelUrl;
}
