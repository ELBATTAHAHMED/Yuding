package com.ahmed.identityservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.Map;

public record RecentSearchRequest(
        @NotBlank(message = "Le type de recherche est obligatoire")
        @Size(max = 32)
        String searchType,

        @Size(max = 100)
        String origin,

        @Size(max = 100)
        String destination,

        LocalDate departureDate,

        LocalDate returnDate,

        Integer travelersCount,

        Map<String, Object> criteriaPayload
) {}
