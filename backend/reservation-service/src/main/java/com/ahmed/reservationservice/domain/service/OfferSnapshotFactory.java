package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.dto.ResolvedOfferDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

/**
 * Domain factory for assembling immutable OfferSnapshot entities from trusted discovery data.
 */
@Component
@RequiredArgsConstructor
public class OfferSnapshotFactory {

    private static final Duration DEFAULT_SNAPSHOT_TTL = Duration.ofMinutes(15);

    private final OfferSnapshotHashGenerator hashGenerator;

    public OfferSnapshot createSnapshot(Booking booking, ResolvedOfferDto resolved, Instant now) {
        if (booking == null) {
            throw new IllegalArgumentException("Booking cannot be null");
        }
        if (resolved == null) {
            throw new IllegalArgumentException("Resolved offer cannot be null");
        }

        ProductType resolvedProductType;
        try {
            resolvedProductType = ProductType.valueOf(resolved.getProductType().trim().toUpperCase());
        } catch (Exception e) {
            throw new BookingConflictException("Invalid product type in resolved offer: " + resolved.getProductType());
        }

        if (booking.getProductType() != resolvedProductType) {
            throw new BookingConflictException(String.format(
                    "Product type mismatch: booking is for [%s] but offer is for [%s]",
                    booking.getProductType(), resolvedProductType));
        }

        Instant captureTime = now != null ? now : Instant.now();
        Instant snapshotExpiry = resolved.getSnapshotExpiresAt() != null
                ? resolved.getSnapshotExpiresAt()
                : (resolved.getProviderExpiresAt() != null ? resolved.getProviderExpiresAt() : captureTime.plus(DEFAULT_SNAPSHOT_TTL));

        Map<String, Object> details = resolved.getSelectedDetails() != null ? resolved.getSelectedDetails() : Map.of();

        // Ensure currency coherence
        String providerCurrency = resolved.getProviderCurrency();
        if (resolved.getProviderAmount() == null) {
            providerCurrency = null;
        } else if (providerCurrency == null || providerCurrency.isBlank()) {
            providerCurrency = "USD"; // Safe default if omitted
        }

        String hash = hashGenerator.generateHash(
                booking.getProductType().name(),
                resolved.getProvider(),
                resolved.getProviderOfferId(),
                details,
                resolved.getProviderAmount(),
                providerCurrency,
                resolved.getDisplayAmount(),
                resolved.getDisplayCurrency(),
                resolved.getExchangeRate(),
                resolved.getExchangeRateDate(),
                resolved.getProviderExpiresAt(),
                snapshotExpiry
        );

        return OfferSnapshot.builder()
                .booking(booking)
                .productType(booking.getProductType())
                .provider(resolved.getProvider() != null ? resolved.getProvider() : "UNKNOWN")
                .providerOfferId(resolved.getProviderOfferId() != null ? resolved.getProviderOfferId() : "UNKNOWN")
                .selectedDetails(details)
                .providerAmount(resolved.getProviderAmount())
                .providerCurrency(providerCurrency)
                .displayAmount(resolved.getDisplayAmount())
                .displayCurrency(resolved.getDisplayCurrency())
                .exchangeRate(resolved.getExchangeRate())
                .exchangeRateDate(resolved.getExchangeRateDate())
                .exchangeRateProvider(resolved.getExchangeRateProvider())
                .providerExpiresAt(resolved.getProviderExpiresAt())
                .snapshotExpiresAt(snapshotExpiry)
                .capturedAt(captureTime)
                .snapshotHash(hash)
                .build();
    }
}
