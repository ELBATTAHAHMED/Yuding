package com.ahmed.identityservice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TripPlanSummaryDto(
        String reference,
        String title,
        @JsonAlias("origin") String originCity,
        @JsonAlias("destination") String destinationCity,
        LocalDate startDate,
        LocalDate endDate,
        @JsonAlias("travelers") Integer travelersCount,
        @JsonAlias("budget") BigDecimal budgetAmount,
        String budgetCurrency,
        String budgetStatus,
        Instant createdAt
) {}
