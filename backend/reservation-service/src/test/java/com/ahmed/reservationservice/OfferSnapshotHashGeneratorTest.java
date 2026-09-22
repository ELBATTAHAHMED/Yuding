package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.service.OfferSnapshotHashGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OfferSnapshotHashGeneratorTest {

    private OfferSnapshotHashGenerator hashGenerator;

    @BeforeEach
    void setUp() {
        hashGenerator = new OfferSnapshotHashGenerator();
    }

    @Test
    @DisplayName("Deterministic: Same inputs produce identical SHA-256 hash")
    void deterministicHash_sameInputs() {
        Map<String, Object> details = Map.of("hotelName", "Atlas Resort", "rooms", 2);
        BigDecimal amount = new BigDecimal("1250.00");
        LocalDate date = LocalDate.of(2026, 10, 15);
        Instant exp = Instant.parse("2026-10-15T12:00:00Z");

        String hash1 = hashGenerator.generateHash("HOTEL", "NUITEE", "lp1897", details, amount, "MAD", amount, "MAD", BigDecimal.ONE, date, exp, exp);
        String hash2 = hashGenerator.generateHash("HOTEL", "NUITEE", "lp1897", details, amount, "MAD", amount, "MAD", BigDecimal.ONE, date, exp, exp);

        assertThat(hash1).isNotNull().hasSize(64).isEqualTo(hash2);
    }

    @Test
    @DisplayName("Stability: Map key insertion ordering does not alter hash")
    void keyOrderingStability_differentOrder_sameHash() {
        Map<String, Object> details1 = new LinkedHashMap<>();
        details1.put("z_key", "last");
        details1.put("a_key", "first");
        details1.put("m_key", "middle");

        Map<String, Object> details2 = new LinkedHashMap<>();
        details2.put("a_key", "first");
        details2.put("m_key", "middle");
        details2.put("z_key", "last");

        BigDecimal amount = new BigDecimal("100.50");
        Instant exp = Instant.parse("2026-10-15T12:00:00Z");

        String hash1 = hashGenerator.generateHash("FLIGHT", "SCRAPPA", "fl-123", details1, amount, "EUR", amount, "EUR", BigDecimal.ONE, null, exp, exp);
        String hash2 = hashGenerator.generateHash("FLIGHT", "SCRAPPA", "fl-123", details2, amount, "EUR", amount, "EUR", BigDecimal.ONE, null, exp, exp);

        assertThat(hash1).isEqualTo(hash2);
    }

    @Test
    @DisplayName("Distinctness: Altered amount produces distinct hash")
    void distinctness_differentAmount_differentHash() {
        Map<String, Object> details = Map.of("origin", "CMN", "destination", "CDG");
        Instant exp = Instant.parse("2026-10-15T12:00:00Z");

        String hash1 = hashGenerator.generateHash("FLIGHT", "SCRAPPA", "fl-1", details, new BigDecimal("150.00"), "EUR", null, null, null, null, null, exp);
        String hash2 = hashGenerator.generateHash("FLIGHT", "SCRAPPA", "fl-1", details, new BigDecimal("150.01"), "EUR", null, null, null, null, null, exp);

        assertThat(hash1).isNotEqualTo(hash2);
    }

    @Test
    @DisplayName("Distinctness: Altered provider produces distinct hash")
    void distinctness_differentProvider_differentHash() {
        Map<String, Object> details = Map.of("title", "Desert Tour");
        Instant exp = Instant.parse("2026-10-15T12:00:00Z");

        String hash1 = hashGenerator.generateHash("ACTIVITY", "HBX", "act-1", details, new BigDecimal("80.00"), "EUR", null, null, null, null, null, exp);
        String hash2 = hashGenerator.generateHash("ACTIVITY", "CUSTOM", "act-1", details, new BigDecimal("80.00"), "EUR", null, null, null, null, null, exp);

        assertThat(hash1).isNotEqualTo(hash2);
    }

    @Test
    @DisplayName("Null price handling: Produces valid hash for price-null offers (e.g. train)")
    void nullPrice_producesValidHash() {
        Map<String, Object> details = Map.of("trainNumber", "AT_0700");
        Instant exp = Instant.parse("2026-10-15T12:00:00Z");

        String hash = hashGenerator.generateHash("TRAIN", "ONCF_GTFS", "train-1", details, null, null, null, null, null, null, null, exp);
        assertThat(hash).isNotNull().hasSize(64);
    }
}
