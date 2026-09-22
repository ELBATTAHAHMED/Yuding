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
 * Safe public projection of a Booking.
 * Hides JPA entity version and internal details while exposing authoritative lifecycle state.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponseDto {

    private UUID id;
    private UUID userId;
    private ProductType productType;
    private BookingStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant statusChangedAt;
    private Instant expiresAt;

    public static BookingResponseDto fromDomain(Booking booking) {
        if (booking == null) {
            return null;
        }
        return BookingResponseDto.builder()
                .id(booking.getId())
                .userId(booking.getUserId())
                .productType(booking.getProductType())
                .status(booking.getStatus())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .statusChangedAt(booking.getStatusChangedAt())
                .expiresAt(booking.getExpiresAt())
                .build();
    }
}
