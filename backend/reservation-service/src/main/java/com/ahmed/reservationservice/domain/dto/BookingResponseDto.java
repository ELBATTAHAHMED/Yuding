package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * Safe public projection of a Booking for public API responses.
 * Uses the public Booking Reference (YUD-XXXXXXXX) as the external identifier,
 * completely hiding internal database primary key UUIDs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponseDto {

    private String bookingReference;
    private UUID userId;
    private ProductType productType;
    private BookingStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant statusChangedAt;
    private Instant expiresAt;
    private OfferSnapshotResponseDto offerSnapshot;

    public static BookingResponseDto fromDomain(Booking booking) {
        return fromDomain(booking, null);
    }

    public static BookingResponseDto fromDomain(Booking booking, com.ahmed.reservationservice.domain.model.OfferSnapshot snapshot) {
        if (booking == null) {
            return null;
        }
        return BookingResponseDto.builder()
                .bookingReference(booking.getBookingReference())
                .userId(booking.getUserId())
                .productType(booking.getProductType())
                .status(booking.getStatus())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .statusChangedAt(booking.getStatusChangedAt())
                .expiresAt(booking.getExpiresAt())
                .offerSnapshot(OfferSnapshotResponseDto.fromDomain(snapshot))
                .build();
    }
}
