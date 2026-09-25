package com.ahmed.identityservice.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record TravelerRequest(
        @NotBlank @Size(max = 100) String firstName,
        @NotBlank @Size(max = 100) String lastName,
        @Past LocalDate dateOfBirth,
        @NotBlank String travelerType
) {}
