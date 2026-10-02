package com.ahmed.reservationservice.domain.dto;

import jakarta.validation.constraints.Size;

public record CancelBookingRequest(@Size(max = 500) String reason) { }
