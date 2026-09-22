package com.ahmed.reservationservice.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Server-authoritative persistent entity recording the finalized pricing quote for a Booking.
 * Append-only immutable record linked to exact Booking, OfferSnapshot, and OfferRevalidation records.
 */
@Entity
@Table(name = "server_pricing_quotes", schema = "booking")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServerPricingQuote {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "booking_id", nullable = false, updatable = false)
    private UUID bookingId;

    @Column(name = "offer_snapshot_id", nullable = false, updatable = false)
    private UUID offerSnapshotId;

    @Column(name = "revalidation_id", nullable = false, updatable = false, unique = true)
    private UUID revalidationId;

    @Column(name = "product_type", nullable = false, length = 32, updatable = false)
    private String productType;

    @Column(name = "provider", nullable = false, length = 64, updatable = false)
    private String provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_status", nullable = false, length = 32, updatable = false)
    private PricingStatus pricingStatus;

    @Column(name = "base_amount", precision = 12, scale = 2, updatable = false)
    private BigDecimal baseAmount;

    @Column(name = "tax_amount", precision = 12, scale = 2, updatable = false)
    private BigDecimal taxAmount;

    @Column(name = "fee_amount", precision = 12, scale = 2, updatable = false)
    private BigDecimal feeAmount;

    @Column(name = "total_amount", precision = 12, scale = 2, updatable = false)
    private BigDecimal totalAmount;

    @Column(name = "currency", length = 3, updatable = false)
    private String currency;

    @Column(name = "breakdown_complete", nullable = false, updatable = false)
    private boolean breakdownComplete;

    @CreationTimestamp
    @Column(name = "priced_at", nullable = false, updatable = false)
    private Instant pricedAt;

    @Column(name = "valid_until", nullable = false, updatable = false)
    private Instant validUntil;

    @Column(name = "pricing_hash", nullable = false, length = 64, updatable = false)
    private String pricingHash;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    /**
     * Checks whether this pricing quote has expired relative to reference timestamp.
     */
    public boolean isExpired(Instant now) {
        Instant current = now != null ? now : Instant.now();
        return !current.isBefore(this.validUntil);
    }
}
