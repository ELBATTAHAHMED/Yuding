package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.service.ServerPricingHashGenerator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ServerPricingHashGeneratorTest {

    private final ServerPricingHashGenerator generator = new ServerPricingHashGenerator();

    private final UUID bookingId = UUID.randomUUID();
    private final UUID snapshotId = UUID.randomUUID();
    private final UUID revalidationId = UUID.randomUUID();
    private final Instant validUntil = Instant.parse("2026-09-22T18:00:00Z");

    @Test
    @DisplayName("Deterministic: Same pricing facts generate identical SHA-256 hash")
    void testDeterministicHash() {
        String hash1 = generator.generateHash(
                bookingId, snapshotId, revalidationId, "FLIGHT", "SCRAPPA",
                PricingStatus.PRICED, new BigDecimal("100.00"), new BigDecimal("15.00"),
                new BigDecimal("5.00"), new BigDecimal("120.00"), "EUR", true, validUntil);

        String hash2 = generator.generateHash(
                bookingId, snapshotId, revalidationId, "FLIGHT", "SCRAPPA",
                PricingStatus.PRICED, new BigDecimal("100.00"), new BigDecimal("15.00"),
                new BigDecimal("5.00"), new BigDecimal("120.00"), "EUR", true, validUntil);

        assertThat(hash1).isNotNull().hasSize(64).isEqualTo(hash2);
    }

    @Test
    @DisplayName("Tamper evident: Changing total amount changes hash")
    void testTamperTotalAmount() {
        String original = generator.generateHash(
                bookingId, snapshotId, revalidationId, "HOTEL", "NUITEE",
                PricingStatus.PRICED, null, null, null, new BigDecimal("250.00"), "USD", false, validUntil);

        String tampered = generator.generateHash(
                bookingId, snapshotId, revalidationId, "HOTEL", "NUITEE",
                PricingStatus.PRICED, null, null, null, new BigDecimal("1.00"), "USD", false, validUntil);

        assertThat(original).isNotEqualTo(tampered);
    }

    @Test
    @DisplayName("Tamper evident: Changing currency changes hash")
    void testTamperCurrency() {
        String original = generator.generateHash(
                bookingId, snapshotId, revalidationId, "ACTIVITY", "HBX",
                PricingStatus.PRICED, null, null, null, new BigDecimal("45.00"), "EUR", false, validUntil);

        String tampered = generator.generateHash(
                bookingId, snapshotId, revalidationId, "ACTIVITY", "HBX",
                PricingStatus.PRICED, null, null, null, new BigDecimal("45.00"), "MAD", false, validUntil);

        assertThat(original).isNotEqualTo(tampered);
    }

    @Test
    @DisplayName("Tamper evident: Changing revalidationId changes hash")
    void testTamperRevalidationId() {
        String original = generator.generateHash(
                bookingId, snapshotId, revalidationId, "TRANSFER", "HBX",
                PricingStatus.PRICED, null, null, null, new BigDecimal("35.00"), "EUR", false, validUntil);

        String tampered = generator.generateHash(
                bookingId, snapshotId, UUID.randomUUID(), "TRANSFER", "HBX",
                PricingStatus.PRICED, null, null, null, new BigDecimal("35.00"), "EUR", false, validUntil);

        assertThat(original).isNotEqualTo(tampered);
    }

    @Test
    @DisplayName("Handles null breakdown values without exception")
    void testNullBreakdownHash() {
        String hash = generator.generateHash(
                bookingId, snapshotId, revalidationId, "TRAIN", "ONCF",
                PricingStatus.NOT_PRICED, null, null, null, null, null, false, validUntil);

        assertThat(hash).isNotNull().hasSize(64);
    }
}
