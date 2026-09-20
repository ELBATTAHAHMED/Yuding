package com.ahmed.travelservice.domain.query;

import com.ahmed.travelservice.domain.enums.TravelClass;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;

@Value
@Builder
public class FlightSearchQuery {
    String origin;
    String destination;
    LocalDate departureDate;
    LocalDate returnDate;
    int adults;
    int children;
    int infants;
    TravelClass travelClass;
    boolean nonStop;
    String currency;

    public boolean isRoundTrip() {
        return returnDate != null;
    }

    public int getTotalPassengers() {
        return adults + children + infants;
    }
}
