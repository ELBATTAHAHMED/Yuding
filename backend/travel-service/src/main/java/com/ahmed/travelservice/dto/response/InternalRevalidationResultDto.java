package com.ahmed.travelservice.dto.response;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Normalized provider-neutral result of a live offer revalidation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalRevalidationResultDto {

    private String productType;
    private String provider;

    private OfferAvailabilityStatus availabilityStatus;
    private OfferPriceStatus priceStatus;

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

    public static InternalRevalidationResultDto unavailable(String productType, String provider, String offerId, String message) {
        return InternalRevalidationResultDto.builder()
                .productType(productType)
                .provider(provider)
                .providerOfferId(offerId)
                .availabilityStatus(OfferAvailabilityStatus.UNAVAILABLE)
                .priceStatus(OfferPriceStatus.NOT_AVAILABLE)
                .revalidatedAt(Instant.now())
                .message(message)
                .build();
    }

    public static InternalRevalidationResultDto unsupported(String productType, String provider, String offerId, String message) {
        return InternalRevalidationResultDto.builder()
                .productType(productType)
                .provider(provider)
                .providerOfferId(offerId)
                .availabilityStatus(OfferAvailabilityStatus.REVALIDATION_UNSUPPORTED)
                .priceStatus(OfferPriceStatus.NOT_AVAILABLE)
                .revalidatedAt(Instant.now())
                .message(message)
                .build();
    }
}
