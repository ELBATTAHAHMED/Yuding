package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.model.PricingStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Generates a deterministic SHA-256 tamper-evident hash for server-authoritative pricing quotes.
 * Guarantees that any modification to pricing facts or validity changes the canonical hash.
 */
@Component
public class ServerPricingHashGenerator {

    public String generateHash(
            UUID bookingId,
            UUID snapshotId,
            UUID revalidationId,
            String productType,
            String provider,
            PricingStatus pricingStatus,
            BigDecimal baseAmount,
            BigDecimal taxAmount,
            BigDecimal feeAmount,
            BigDecimal totalAmount,
            String currency,
            boolean breakdownComplete,
            Instant validUntil) {

        StringBuilder sb = new StringBuilder();
        sb.append(bookingId != null ? bookingId.toString() : "NULL").append(":");
        sb.append(snapshotId != null ? snapshotId.toString() : "NULL").append(":");
        sb.append(revalidationId != null ? revalidationId.toString() : "NULL").append(":");
        sb.append(productType != null ? productType.trim().toUpperCase() : "NULL").append(":");
        sb.append(provider != null ? provider.trim().toUpperCase() : "NULL").append(":");
        sb.append(pricingStatus != null ? pricingStatus.name() : "NULL").append(":");
        sb.append(formatAmount(baseAmount)).append(":");
        sb.append(formatAmount(taxAmount)).append(":");
        sb.append(formatAmount(feeAmount)).append(":");
        sb.append(formatAmount(totalAmount)).append(":");
        sb.append(currency != null ? currency.trim().toUpperCase() : "NULL").append(":");
        sb.append(breakdownComplete).append(":");
        sb.append(validUntil != null ? validUntil.toEpochMilli() : "NULL");

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) {
            return "NULL";
        }
        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
