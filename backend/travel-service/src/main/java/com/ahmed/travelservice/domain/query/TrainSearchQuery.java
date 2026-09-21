package com.ahmed.travelservice.domain.query;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalTime;

@Value
@Builder
public class TrainSearchQuery {
    String originStation;
    String destinationStation;
    LocalDate date;
    LocalTime departureTime;
    String currency;
}
