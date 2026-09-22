package com.ahmed.reservationservice.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/**
 * Trusted DTO received from Travel Service via Feign client during offer resolution.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolvedOfferDto {

    private String selectionRef;
    private String productType;
    private String provider;
    private String providerOfferId;
    private Map<String, Object> selectedDetails;
    private BigDecimal providerAmount;
    private String providerCurrency;
    private BigDecimal displayAmount;
    private String displayCurrency;
    private BigDecimal exchangeRate;
    private LocalDate exchangeRateDate;
    private String exchangeRateProvider;
    private Instant providerExpiresAt;
    private Instant snapshotExpiresAt;
}
