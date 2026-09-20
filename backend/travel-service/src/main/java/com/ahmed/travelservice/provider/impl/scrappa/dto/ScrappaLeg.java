package com.ahmed.travelservice.provider.impl.scrappa.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single flight leg segment from the Scrappa Google Flights API.
 * Maps to the leg objects inside flights[].legs / flights[].outbound_legs.
 * Unknown fields are silently ignored (ignoreUnknown).
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScrappaLeg {

    @JsonProperty("departure_airport")
    private String departureAirport;

    @JsonProperty("arrival_airport")
    private String arrivalAirport;

    @JsonProperty("departure_time")
    private String departureTime;

    @JsonProperty("arrival_time")
    private String arrivalTime;

    /** IATA carrier code (e.g. "AT"). */
    @JsonProperty("airline")
    private String airlineCode;

    /** Human-readable airline name, if provided. */
    @JsonProperty("airline_name")
    private String airlineName;

    @JsonProperty("flight_number")
    private String flightNumber;

    @JsonProperty("duration_minutes")
    private Integer durationMinutes;

    @JsonProperty("stops")
    private Integer stops;

    @JsonProperty("aircraft")
    private String aircraft;
}
