package com.ahmed.reservationservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminBookingDto {
    private UUID id;
    private String bookingReference;
    private UUID userId;
    private String productType;
    private String status;
    private BigDecimal amount;
    private String currency;
    private String provider;
    private String providerOfferId;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant statusChangedAt;
    private Instant expiresAt;
}
