package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Normalized representation of a single flight leg (segment) within a flight offer.
 * Provider-neutral — built from Scrappa or any future provider's leg/segment data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlightLegDto {
    /** IATA airport code for departure (e.g. "CMN"). */
    private String departureAirport;

    /** IATA airport code for arrival (e.g. "CDG"). */
    private String arrivalAirport;

    /** ISO-8601 local departure time string as returned by provider (e.g. "2026-10-15T06:00:00"). */
    private String departureTime;

    /** ISO-8601 local arrival time string as returned by provider (e.g. "2026-10-15T09:30:00"). */
    private String arrivalTime;

    /** IATA airline code (e.g. "AT"). */
    private String airlineCode;

    /** Human-readable airline name, if available from provider. */
    private String airlineName;

    /** Flight number without airline prefix (e.g. "703"). */
    private String flightNumber;

    /** Duration of this leg in minutes. */
    private Integer durationMinutes;

    /** Number of stops on this leg (0 = direct). */
    private Integer stops;

    /** Aircraft type/model, if supplied by provider. */
    private String aircraft;
}
