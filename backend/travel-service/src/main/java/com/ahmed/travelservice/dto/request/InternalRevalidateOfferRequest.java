package com.ahmed.travelservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * Trusted server-to-server request for live offer revalidation.
 * Derived from persistent OfferSnapshot; never authored directly by frontend client.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalRevalidateOfferRequest {

    @NotBlank(message = "productType is mandatory")
    private String productType;

    @NotBlank(message = "provider is mandatory")
    private String provider;

    private String providerOfferId;

    private BigDecimal snapshotProviderAmount;

    private String snapshotProviderCurrency;

    private Map<String, Object> selectedDetails;

    private Instant providerExpiresAt;
}
