package com.ahmed.reservationservice.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalRevalidateOfferRequest {

    private String productType;
    private String provider;
    private String providerOfferId;
    private BigDecimal snapshotProviderAmount;
    private String snapshotProviderCurrency;
    private Map<String, Object> selectedDetails;
    private Instant providerExpiresAt;
}
