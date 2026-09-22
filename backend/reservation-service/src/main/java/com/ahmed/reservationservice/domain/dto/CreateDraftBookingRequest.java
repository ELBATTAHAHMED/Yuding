package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.ProductType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Minimal payload accepted when creating a DRAFT booking shell.
 * User ID, status, price, and payment state are strictly server-authoritative.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDraftBookingRequest {

    @NotNull(message = "Product type is required (FLIGHT, HOTEL, ACTIVITY, TRANSFER, TRAIN)")
    private ProductType productType;
}
