package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Safe public projection for offer revalidation responses.
 * Never exposes internal UUIDs (id, booking_id, offer_snapshot_id) or secrets.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingRevalidationResponseDto {

    private String bookingReference;
    private String provider;
    private String productType;
    private String availabilityStatus;
    private String priceStatus;
    private BigDecimal previousProviderAmount;
    private String previousProviderCurrency;
    private BigDecimal currentProviderAmount;
    private String currentProviderCurrency;
    private Instant revalidatedAt;
    private Instant validUntil;
    private boolean requiresPriceConfirmation;
    private boolean priceChangeAccepted;
    private boolean canProceedToPricing;
    private String message;

    public static BookingRevalidationResponseDto fromDomain(String bookingReference,
                                                            OfferRevalidation reval,
                                                            boolean canProceedToPricing,
                                                            String message) {
        boolean priceChanged = "CHANGED".equalsIgnoreCase(reval.getPriceStatus());
        boolean accepted = reval.getPriceChangeAcceptedAt() != null;
        boolean requiresConfirmation = priceChanged && !accepted;

        return BookingRevalidationResponseDto.builder()
                .bookingReference(bookingReference)
                .provider(reval.getProvider())
                .productType(reval.getProductType())
                .availabilityStatus(reval.getAvailabilityStatus())
                .priceStatus(reval.getPriceStatus())
                .previousProviderAmount(reval.getSnapshotProviderAmount())
                .previousProviderCurrency(reval.getSnapshotProviderCurrency())
                .currentProviderAmount(reval.getCurrentProviderAmount())
                .currentProviderCurrency(reval.getCurrentProviderCurrency())
                .revalidatedAt(reval.getRevalidatedAt())
                .validUntil(reval.getValidUntil())
                .requiresPriceConfirmation(requiresConfirmation)
                .priceChangeAccepted(accepted)
                .canProceedToPricing(canProceedToPricing)
                .message(message)
                .build();
    }
}
