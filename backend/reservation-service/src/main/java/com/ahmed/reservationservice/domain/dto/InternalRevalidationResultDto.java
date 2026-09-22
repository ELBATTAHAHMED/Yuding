package com.ahmed.reservationservice.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalRevalidationResultDto {

    private String productType;
    private String provider;
    private String availabilityStatus;
    private String priceStatus;
    private BigDecimal snapshotProviderAmount;
    private String snapshotProviderCurrency;
    private BigDecimal currentProviderAmount;
    private String currentProviderCurrency;
    private String providerOfferId;
    private String matchedProviderOfferId;
    private Instant revalidatedAt;
    private Instant validUntil;
    private Instant providerExpiresAt;
    private String message;
}
