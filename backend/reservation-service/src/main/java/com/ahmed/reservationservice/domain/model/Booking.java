package com.ahmed.reservationservice.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Booking Aggregate Root for Yuding V2.
 * Strictly encapsulates lifecycle status mutations, UTC timestamps, and optimistic locking.
 */
@Entity
@Table(name = "bookings", schema = "booking")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false, length = 32)
    private ProductType productType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 24)
    private BookingStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "status_changed_at", nullable = false)
    private Instant statusChangedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    /**
     * Domain factory method to initialize a new DRAFT booking shell.
     */
    public static Booking createDraft(UUID userId, ProductType productType, Instant now, Instant expiresAt) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID cannot be null");
        }
        if (productType == null) {
            throw new IllegalArgumentException("Product type cannot be null");
        }
        Instant timestamp = now != null ? now : Instant.now();
        return Booking.builder()
                .userId(userId)
                .productType(productType)
                .status(BookingStatus.DRAFT)
                .createdAt(timestamp)
                .updatedAt(timestamp)
                .statusChangedAt(timestamp)
                .expiresAt(expiresAt)
                .version(0)
                .build();
    }

    /**
     * Executes a server-authoritative lifecycle state transition.
     * Validates transition rules via BookingLifecycle authority.
     */
    public void transitionTo(BookingStatus targetStatus, Instant now) {
        BookingLifecycle.validateTransition(this.status, targetStatus);
        Instant timestamp = now != null ? now : Instant.now();
        this.status = targetStatus;
        this.statusChangedAt = timestamp;
        this.updatedAt = timestamp;
    }

    /**
     * Updates expiration timestamp for the booking.
     */
    public void updateExpiresAt(Instant newExpiresAt, Instant now) {
        this.expiresAt = newExpiresAt;
        this.updatedAt = now != null ? now : Instant.now();
    }

    /**
     * Evaluates if the booking is expired relative to the given reference instant.
     */
    public boolean isExpired(Instant now) {
        Instant current = now != null ? now : Instant.now();
        return this.status != null
                && this.status.canExpire()
                && this.expiresAt != null
                && current.isAfter(this.expiresAt);
    }
}
