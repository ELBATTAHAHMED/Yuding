package com.ahmed.reservationservice.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

/**
 * Immutable Offer Snapshot Entity for Yuding V2.
 * Captures a durable, tamper-proof historical record of what the user selected during discovery.
 * Strictly decoupled from Phase 36 revalidation and Phase 37 authoritative pricing.
 */
@Entity
@Table(name = "offer_snapshots", schema = "booking")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class OfferSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true, updatable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false, length = 32, updatable = false)
    private ProductType productType;

    @Column(name = "provider", nullable = false, length = 64, updatable = false)
    private String provider;

    @Column(name = "provider_offer_id", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String providerOfferId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "selected_details", nullable = false, updatable = false, columnDefinition = "jsonb")
    private Map<String, Object> selectedDetails;

    @Column(name = "provider_amount", precision = 12, scale = 2, updatable = false)
    private BigDecimal providerAmount;

    @Column(name = "provider_currency", length = 3, updatable = false)
    private String providerCurrency;

    @Column(name = "display_amount", precision = 12, scale = 2, updatable = false)
    private BigDecimal displayAmount;

    @Column(name = "display_currency", length = 3, updatable = false)
    private String displayCurrency;

    @Column(name = "exchange_rate", precision = 18, scale = 6, updatable = false)
    private BigDecimal exchangeRate;

    @Column(name = "exchange_rate_date", updatable = false)
    private LocalDate exchangeRateDate;

    @Column(name = "exchange_rate_provider", length = 64, updatable = false)
    private String exchangeRateProvider;

    @Column(name = "provider_expires_at", updatable = false)
    private Instant providerExpiresAt;

    @Column(name = "snapshot_expires_at", nullable = false, updatable = false)
    private Instant snapshotExpiresAt;

    @Column(name = "captured_at", nullable = false, updatable = false)
    private Instant capturedAt;

    @Column(name = "snapshot_hash", nullable = false, length = 64, updatable = false)
    private String snapshotHash;

    /**
     * Checks whether this selection snapshot has expired relative to the given reference instant.
     */
    public boolean isExpired(Instant now) {
        Instant current = now != null ? now : Instant.now();
        return current.isAfter(this.snapshotExpiresAt);
    }
}
