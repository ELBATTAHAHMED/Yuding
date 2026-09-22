package com.ahmed.reservationservice.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request payload to attach a selected offer snapshot to an existing DRAFT booking.
 * Accepts ONLY the server-issued selection reference.
 * Prevents client authoring/tampering of price, currency, provider, or details.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachOfferSnapshotRequest {

    @NotBlank(message = "Selection reference is required")
    private String selectionRef;
}
