package com.ahmed.travelservice.dto.response;

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
public class OfferRevalidationResult {
    private String offerId;
    private String provider;
    private boolean available;
    private BigDecimal currentPrice;
    private String currency;
    private boolean priceChanged;
    private String providerOfferReference;
    private Instant expiresAt;
    private String message;

    public static OfferRevalidationResult unavailable(String offerId, String provider, String message) {
        return OfferRevalidationResult.builder()
                .offerId(offerId)
                .provider(provider != null ? provider : "NONE")
                .available(false)
                .currentPrice(null)
                .currency(null)
                .priceChanged(false)
                .providerOfferReference(null)
                .expiresAt(null)
                .message(message != null ? message : "Offer is not available or provider is not connected")
                .build();
    }
}
