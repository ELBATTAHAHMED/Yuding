package com.ahmed.reservationservice.domain.dto;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for capturing a payment order.
 * Phase 39: Strictly allowlisted fields only. Rejects raw card credentials (PAN, CVV, expiry).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = false)
public class PaymentCaptureRequestDto {
    private String paymentReference;
    private String providerOrderId;

    @JsonAnySetter
    public void handleUnknownProperty(String name, Object value) {
        throw new IllegalArgumentException("Forbidden or unrecognized property provided: " + name);
    }
}
