package com.ahmed.identityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SavedTripRequest(
        @NotBlank(message = "La référence du plan de voyage est obligatoire")
        @Pattern(regexp = "^TRP-[A-Z0-9]{8,12}$", message = "Format de référence de voyage invalide (ex: TRP-XXXXXXXX)")
        @Size(max = 32)
        String tripPlanReference
) {}
