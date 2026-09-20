package com.ahmed.travelservice.domain.query;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Value
@Builder
public class HotelSearchQuery {
    String destination;
    LocalDate checkIn;
    LocalDate checkOut;
    int rooms;
    int adults;
    int children;
    String propertyType;
    String currency;

    public long getNumberOfNights() {
        if (checkIn == null || checkOut == null) return 0;
        return ChronoUnit.DAYS.between(checkIn, checkOut);
    }

    public int getTotalGuests() {
        return adults + children;
    }
}
