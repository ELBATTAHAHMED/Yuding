package com.ahmed.aiservice.domain.planner.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPlanDayDto {

    private UUID id;
    private int dayNumber;
    private LocalDate date;
    private String theme;
    private String weatherForecast;
    private BigDecimal estimatedCost;

    @Builder.Default
    private List<TripPlanItemDto> morning = new ArrayList<>();

    @Builder.Default
    private List<TripPlanItemDto> afternoon = new ArrayList<>();

    @Builder.Default
    private List<TripPlanItemDto> evening = new ArrayList<>();
}
