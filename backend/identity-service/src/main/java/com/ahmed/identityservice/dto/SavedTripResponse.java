package com.ahmed.identityservice.dto;

import com.ahmed.identityservice.model.UserSavedTrip;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record SavedTripResponse(
        String publicReference,
        String tripPlanReference,
        String title,
        String destinationCity,
        String originCity,
        LocalDate startDate,
        LocalDate endDate,
        Integer travelersCount,
        BigDecimal budgetAmount,
        String budgetCurrency,
        Instant planCreatedAt,
        Instant savedAt
) {
    public static SavedTripResponse from(UserSavedTrip savedTrip) {
        return new SavedTripResponse(
                savedTrip.getPublicReference(),
                savedTrip.getTripPlanReference(),
                savedTrip.getTitle(),
                savedTrip.getDestinationCity(),
                savedTrip.getOriginCity(),
                savedTrip.getStartDate(),
                savedTrip.getEndDate(),
                savedTrip.getTravelersCount(),
                savedTrip.getBudgetAmount(),
                savedTrip.getBudgetCurrency(),
                savedTrip.getPlanCreatedAt(),
                savedTrip.getSavedAt()
        );
    }
}
