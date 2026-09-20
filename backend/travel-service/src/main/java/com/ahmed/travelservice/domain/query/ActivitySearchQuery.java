package com.ahmed.travelservice.domain.query;

import com.ahmed.travelservice.domain.enums.ActivityCategory;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class ActivitySearchQuery {
    String destination;
    LocalDate date;
    int travelers;
    ActivityCategory category;
    int radiusKm;
    String currency;
}
