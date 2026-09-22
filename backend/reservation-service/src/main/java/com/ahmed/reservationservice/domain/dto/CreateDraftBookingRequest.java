package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.ProductType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload accepted when creating a DRAFT booking shell.
 * User ID, status, price, and payment state are strictly server-authoritative.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateDraftBookingRequest {

    @NotNull(message = "Product type is required (FLIGHT, HOTEL, ACTIVITY, TRANSFER, TRAIN)")
    private ProductType productType;

    /** Optional server-issued selection reference to atomically attach an offer snapshot upon creation. */
    private String selectionRef;

    public CreateDraftBookingRequest(ProductType productType) {
        this.productType = productType;
    }
}
