package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Map;

/**
 * Domain factory for assembling immutable, server-authoritative ServerPricingQuote entities.
 * Strictly derives all pricing facts from trusted backend state (Booking + OfferSnapshot + OfferRevalidation).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ServerPricingFactory {

    private final ServerPricingHashGenerator hashGenerator;

    public ServerPricingQuote createPricingQuote(Booking booking, OfferSnapshot snapshot, OfferRevalidation revalidation, Instant now) {
        if (booking == null) {
            throw new IllegalArgumentException("Booking cannot be null");
        }
        if (snapshot == null) {
            throw new IllegalArgumentException("OfferSnapshot cannot be null");
        }
        if (revalidation == null) {
            throw new IllegalArgumentException("OfferRevalidation cannot be null");
        }

        Instant pricedAt = now != null ? now : Instant.now();
        Instant validUntil = revalidation.getValidUntil();
        if (validUntil == null) {
            throw new BookingConflictException("Revalidation validity window is missing");
        }

        String productType = booking.getProductType().name();
        String provider = revalidation.getProvider() != null ? revalidation.getProvider() : snapshot.getProvider();

        PricingStatus pricingStatus;
        BigDecimal totalAmount = null;
        String currency = null;
        BigDecimal baseAmount = null;
        BigDecimal taxAmount = null;
        BigDecimal feeAmount = null;
        boolean breakdownComplete = false;

        String priceStatus = revalidation.getPriceStatus() != null ? revalidation.getPriceStatus().toUpperCase() : "UNKNOWN";

        // Handle products without monetary fare (e.g., ONCF / Transitous schedule trains, or unpriced offers)
        if ("NOT_APPLICABLE".equals(priceStatus)
                || revalidation.getCurrentProviderAmount() == null
                || revalidation.getCurrentProviderAmount().compareTo(BigDecimal.ZERO) <= 0) {
            pricingStatus = "NOT_APPLICABLE".equals(priceStatus) ? PricingStatus.NOT_APPLICABLE : PricingStatus.NOT_PRICED;
            log.info("ServerPricingFactory: Product [{}] from [{}] is [{}]; no monetary total fabricated.",
                    productType, provider, pricingStatus);
        } else {
            pricingStatus = PricingStatus.PRICED;
            totalAmount = revalidation.getCurrentProviderAmount().setScale(2, RoundingMode.HALF_UP);
            currency = normalizeCurrency(revalidation.getCurrentProviderCurrency());

            // Attempt truthful breakdown extraction if provider supplied reconciled components
            Map<String, Object> details = snapshot.getSelectedDetails();
            if (details != null && !details.isEmpty()) {
                BigDecimal b = parseAmount(details.get("baseAmount"), details.get("basePrice"), details.get("baseRate"));
                BigDecimal t = parseAmount(details.get("taxAmount"), details.get("taxes"), details.get("tax"));
                BigDecimal f = parseAmount(details.get("feeAmount"), details.get("fees"), details.get("fee"));

                if (b != null && t != null && f != null) {
                    BigDecimal sum = b.add(t).add(f);
                    if (sum.compareTo(totalAmount) == 0) {
                        baseAmount = b.setScale(2, RoundingMode.HALF_UP);
                        taxAmount = t.setScale(2, RoundingMode.HALF_UP);
                        feeAmount = f.setScale(2, RoundingMode.HALF_UP);
                        breakdownComplete = true;
                    }
                }
            }
        }

        String hash = hashGenerator.generateHash(
                booking.getId(),
                snapshot.getId(),
                revalidation.getId(),
                productType,
                provider,
                pricingStatus,
                baseAmount,
                taxAmount,
                feeAmount,
                totalAmount,
                currency,
                breakdownComplete,
                validUntil
        );

        return ServerPricingQuote.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .revalidationId(revalidation.getId())
                .productType(productType)
                .provider(provider)
                .pricingStatus(pricingStatus)
                .baseAmount(baseAmount)
                .taxAmount(taxAmount)
                .feeAmount(feeAmount)
                .totalAmount(totalAmount)
                .currency(currency)
                .breakdownComplete(breakdownComplete)
                .pricedAt(pricedAt)
                .validUntil(validUntil)
                .pricingHash(hash)
                .version(0)
                .build();
    }

    private String normalizeCurrency(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BookingConflictException("Authoritative monetary price requires a valid ISO-4217 currency code");
        }
        String clean = raw.trim().toUpperCase();
        if (!clean.matches("^[A-Z]{3}$")) {
            throw new BookingConflictException("Invalid currency format: " + clean);
        }
        return clean;
    }

    private BigDecimal parseAmount(Object... candidates) {
        for (Object c : candidates) {
            if (c == null) continue;
            if (c instanceof BigDecimal bd) return bd;
            if (c instanceof Number num) return BigDecimal.valueOf(num.doubleValue());
            if (c instanceof String str && !str.isBlank()) {
                try {
                    return new BigDecimal(str.trim());
                } catch (NumberFormatException ignored) {}
            }
        }
        return null;
    }
}
