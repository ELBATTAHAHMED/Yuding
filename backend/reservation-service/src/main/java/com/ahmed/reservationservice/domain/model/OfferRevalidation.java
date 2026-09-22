package com.ahmed.reservationservice.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Server-authoritative persistent entity recording the outcome of a live offer revalidation.
 * Append-only history linked to Booking and OfferSnapshot.
 */
@Entity
@Table(name = "offer_revalidations", schema = "booking")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferRevalidation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "booking_id", nullable = false, updatable = false)
    private UUID bookingId;

    @Column(name = "offer_snapshot_id", nullable = false, updatable = false)
    private UUID offerSnapshotId;

    @Column(name = "provider", nullable = false, length = 64, updatable = false)
    private String provider;

    @Column(name = "product_type", nullable = false, length = 32, updatable = false)
    private String productType;

    @Column(name = "availability_status", nullable = false, length = 32, updatable = false)
    private String availabilityStatus;

    @Column(name = "price_status", nullable = false, length = 32, updatable = false)
    private String priceStatus;

    @Column(name = "snapshot_provider_amount", precision = 12, scale = 2, updatable = false)
    private BigDecimal snapshotProviderAmount;

    @Column(name = "snapshot_provider_currency", length = 3, updatable = false)
    private String snapshotProviderCurrency;

    @Column(name = "current_provider_amount", precision = 12, scale = 2, updatable = false)
    private BigDecimal currentProviderAmount;

    @Column(name = "current_provider_currency", length = 3, updatable = false)
    private String currentProviderCurrency;

    @Column(name = "provider_offer_id", length = 255, updatable = false)
    private String providerOfferId;

    @Column(name = "matched_provider_offer_id", length = 255, updatable = false)
    private String matchedProviderOfferId;

    @CreationTimestamp
    @Column(name = "revalidated_at", nullable = false, updatable = false)
    private Instant revalidatedAt;

    @Column(name = "valid_until", nullable = false, updatable = false)
    private Instant validUntil;

    @Column(name = "provider_expires_at", updatable = false)
    private Instant providerExpiresAt;

    @Column(name = "price_change_accepted_at")
    private Instant priceChangeAcceptedAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;
}
