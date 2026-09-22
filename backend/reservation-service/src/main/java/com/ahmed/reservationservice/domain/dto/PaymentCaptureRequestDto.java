package com.ahmed.reservationservice.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for capturing a payment order.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCaptureRequestDto {
    private String paymentReference;
    private String providerOrderId;
}
