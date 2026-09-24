package com.ahmed.aiservice.domain.planner.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPlanRequest {

    @NotBlank(message = "Origin must not be blank")
    private String origin;

    @NotBlank(message = "Destination must not be blank")
    private String destination;

    @NotNull(message = "Start date is mandatory")
    private LocalDate startDate;

    @NotNull(message = "End date is mandatory")
    private LocalDate endDate;

    @Min(value = 1, message = "At least 1 traveler is required")
    @Builder.Default
    private int travelers = 1;

    @NotNull(message = "Budget is mandatory")
    @DecimalMin(value = "1.00", message = "Budget must be greater than 0")
    private BigDecimal budget;

    @Builder.Default
    private String budgetCurrency = "MAD";

    @Builder.Default
    private List<String> preferences = new ArrayList<>();

    private String pace; // RELAXED, MODERATE, INTENSE

    private String accommodationPreference; // BUDGET, COMFORT, LUXURY

    private String notes;
}
