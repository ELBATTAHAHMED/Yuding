package com.ahmed.reservationservice.domain.dto;

import java.util.UUID;

public record ReviewEligibilityDto(String bookingReference, UUID bookingId, boolean eligible,
                                   String reason, String entityType, String provider,
                                   String entityReference, String entityName) { }
