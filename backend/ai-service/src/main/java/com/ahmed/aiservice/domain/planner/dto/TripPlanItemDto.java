package com.ahmed.aiservice.domain.planner.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TripPlanItemDto {

    private UUID id;
    private String type; // FLIGHT, HOTEL, ACTIVITY, TRANSFER
    private String title;
    private String provider;
    private String offerReference;
    private Instant startTime;
    private Instant endTime;
    private BigDecimal price;
    private String currency;
    private BigDecimal priceInBudgetCurrency;
    @Builder.Default
    private boolean isPriced = true;
    private Integer dayNumber;
    private String slot; // MORNING, AFTERNOON, EVENING, ALL_DAY
    private String detailsJson;
    private Map<String, Object> details;
}
