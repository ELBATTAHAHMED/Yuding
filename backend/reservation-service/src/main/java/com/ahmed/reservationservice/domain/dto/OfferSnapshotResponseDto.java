package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/**
 * Safe public projection of an OfferSnapshot.
 * Decoupled from internal database UUIDs and database foreign keys.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferSnapshotResponseDto {

    private ProductType productType;
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
    private Instant capturedAt;
    private String snapshotHash;
    private Boolean isExpired;

    public static OfferSnapshotResponseDto fromDomain(OfferSnapshot snapshot) {
        if (snapshot == null) {
            return null;
        }
        Instant now = Instant.now();
        return OfferSnapshotResponseDto.builder()
                .productType(snapshot.getProductType())
                .provider(snapshot.getProvider())
                .providerOfferId(snapshot.getProviderOfferId())
                .selectedDetails(snapshot.getSelectedDetails())
                .providerAmount(snapshot.getProviderAmount())
                .providerCurrency(snapshot.getProviderCurrency())
                .displayAmount(snapshot.getDisplayAmount())
                .displayCurrency(snapshot.getDisplayCurrency())
                .exchangeRate(snapshot.getExchangeRate())
                .exchangeRateDate(snapshot.getExchangeRateDate())
                .exchangeRateProvider(snapshot.getExchangeRateProvider())
                .providerExpiresAt(snapshot.getProviderExpiresAt())
                .snapshotExpiresAt(snapshot.getSnapshotExpiresAt())
                .capturedAt(snapshot.getCapturedAt())
                .snapshotHash(snapshot.getSnapshotHash())
                .isExpired(snapshot.isExpired(now))
                .build();
    }
}
