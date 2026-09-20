package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlightOfferDto {
    private String offerId;
    private String provider;
    private String airlineCode;
    private String airlineName;
    private String flightNumber;
    private String origin;
    private String destination;
    private Instant departureTime;
    private Instant arrivalTime;
    private String cabinClass;
    private BigDecimal price;
    private String currency;
    private Integer availableSeats;
}
