package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Normalized model for a single leg within a multi-leg or direct train journey.
 * Enables representation of transfers, connections, and multi-operator trips.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainLegDto {

    /** Transport mode, e.g. "HIGHSPEED_RAIL", "LONG_DISTANCE", "REGIONAL_RAIL", "WALK", "TRAM". */
    private String mode;

    /** Operating carrier / agency name, e.g. "SNCF Voyageurs", "Deutsche Bahn", "ONCF". */
    private String operator;

    /** Line / service identifier, e.g. "TGV INOUI 6605", "ICE 513", "Al Boraq 7001". */
    private String serviceName;

    /** Departure station or place name for this leg. */
    private String origin;

    /** Destination station or place name for this leg. */
    private String destination;

    /** Scheduled departure time (HH:mm or ISO format). */
    private String departureTime;

    /** Scheduled arrival time (HH:mm or ISO format). */
    private String arrivalTime;

    /** Duration of this leg in minutes. */
    private Integer durationMinutes;

    /** Intermediate stops served during this leg. */
    private List<TrainStopDto> intermediateStops;

    /** Whether live real-time delay/status was available for this leg. */
    private boolean realTime;

    /** Whether this leg was cancelled. */
    private boolean cancelled;
}
