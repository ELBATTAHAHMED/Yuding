package com.ahmed.reservationservice.domain.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.TreeMap;

/**
 * Generates deterministic SHA-256 integrity digests for immutable offer snapshots.
 * Enforces canonical ordering of keys and values to guarantee reproducible hashes.
 */
@Component
public class OfferSnapshotHashGenerator {

    private final ObjectMapper canonicalMapper;

    public OfferSnapshotHashGenerator() {
        this.canonicalMapper = JsonMapper.builder()
                .configure(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY, true)
                .configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true)
                .build();
    }

    public String generateHash(
            String productType,
            String provider,
            String providerOfferId,
            Map<String, Object> selectedDetails,
            BigDecimal providerAmount,
            String providerCurrency,
            BigDecimal displayAmount,
            String displayCurrency,
            BigDecimal exchangeRate,
            LocalDate exchangeRateDate,
            Instant providerExpiresAt,
            Instant snapshotExpiresAt) {

        String detailsJson = canonicalizeDetails(selectedDetails);

        String canonicalString = String.format(
                "pt=%s|prov=%s|poid=%s|pamt=%s|pcur=%s|damt=%s|dcur=%s|rate=%s|rdate=%s|pexp=%s|sexp=%s|details=%s",
                productType != null ? productType.trim().toUpperCase() : "",
                provider != null ? provider.trim().toUpperCase() : "",
                providerOfferId != null ? providerOfferId.trim() : "",
                formatMoney(providerAmount),
                providerCurrency != null ? providerCurrency.trim().toUpperCase() : "",
                formatMoney(displayAmount),
                displayCurrency != null ? displayCurrency.trim().toUpperCase() : "",
                formatRate(exchangeRate),
                exchangeRateDate != null ? exchangeRateDate.toString() : "",
                providerExpiresAt != null ? providerExpiresAt.toString() : "",
                snapshotExpiresAt != null ? snapshotExpiresAt.toString() : "",
                detailsJson
        );

        return sha256Hex(canonicalString);
    }

    private String canonicalizeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) {
            return "{}";
        }
        try {
            Map<String, Object> sorted = sortMapRecursively(details);
            return canonicalMapper.writeValueAsString(sorted);
        } catch (JsonProcessingException e) {
            return details.toString();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> sortMapRecursively(Map<String, Object> map) {
        if (map == null) return null;
        Map<String, Object> treeMap = new TreeMap<>();
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            Object val = entry.getValue();
            if (val instanceof Map) {
                treeMap.put(entry.getKey(), sortMapRecursively((Map<String, Object>) val));
            } else {
                treeMap.put(entry.getKey(), val);
            }
        }
        return treeMap;
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) return "NULL";
        return amount.stripTrailingZeros().toPlainString();
    }

    private String formatRate(BigDecimal rate) {
        if (rate == null) return "NULL";
        return rate.stripTrailingZeros().toPlainString();
    }

    public static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available in JVM", e);
        }
    }
}
