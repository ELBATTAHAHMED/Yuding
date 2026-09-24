package com.ahmed.aiservice.domain.planner.dto;

import com.ahmed.aiservice.dto.AiSourceDto;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPlanDto {

    private String reference;
    private String title;
    private String summary;
    private String origin;
    private String destination;
    private LocalDate startDate;
    private LocalDate endDate;
    private int travelers;
    private BigDecimal budget;
    private String budgetCurrency;
    private BigDecimal pricedTotal;
    private BigDecimal remainingBudget;
    private int unpricedItemsCount;
    private String budgetStatus; // WITHIN_BUDGET, OVER_BUDGET, PARTIALLY_PRICED
    private String dataFreshness; // FRESH, STALE, REFRESHED
    private int version;
    private Instant createdAt;
    private Instant updatedAt;

    private TripPlanItemDto flight;
    private TripPlanItemDto returnFlight;
    private TripPlanItemDto hotel;
    private TripPlanItemDto transfer;

    @Builder.Default
    private List<TripPlanDayDto> days = new ArrayList<>();

    private String weatherSummary;

    @Builder.Default
    private List<AiSourceDto> sources = new ArrayList<>();

    @Builder.Default
    private List<String> warnings = new ArrayList<>();
}
