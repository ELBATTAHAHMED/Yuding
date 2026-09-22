package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Provider-neutral representation of a train journey schedule offer.
 * Strictly adheres to Yuding V2 pricing and freshness principles:
 * - price is null when fare data is absent in GTFS (never invent prices)
 * - contains explicit provenance and service calendar validity dates.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainOfferDto {

    private String offerId;
    private String selectionRef;

    /** Provider code, e.g. "TRANSITLAND". */
    private String provider;

    /** Provenance identifier, e.g. "TRANSITLAND_ONCF_GTFS". */
    private String source;

    /** Rail operator, e.g. "ONCF (Office National des Chemins de Fer)". */
    private String operator;

    /** Train / trip identifier, e.g. "AT_CASA_MKC_0700". */
    private String trainNumber;

    /** Route description, e.g. "Al Atlas / Casablanca - Marrakech". */
    private String routeName;

    /** Product brand when explicitly identified in GTFS, e.g. "Al Boraq", "Al Atlas", "TNR". */
    private String productType;

    /** Origin departure station name. */
    private String originStation;

    /** Origin station identifier / code. */
    private String originStationId;

    /** Destination arrival station name. */
    private String destinationStation;

    /** Destination station identifier / code. */
    private String destinationStationId;

    /** Service / departure date in ISO format (YYYY-MM-DD). */
    private String departureDate;

    /** Local scheduled departure time (HH:mm or HH:mm:ss). */
    private String departureTime;

    /** Local scheduled arrival time (HH:mm or HH:mm:ss). */
    private String arrivalTime;

    /** Total journey duration in minutes. */
    private Integer durationMinutes;

    /** Whether the journey is direct without transfers. */
    private boolean direct;

    /** Number of transfers / connections (0 for direct journeys). */
    private int numberOfTransfers;

    /** Number of intermediate stops. */
    private int stopsCount;

    /** Ordered sequence of intermediate / terminal stops with scheduled times. */
    private List<TrainStopDto> intermediateStops;

    /** Journey legs for multi-leg or connection trips. */
    private List<TrainLegDto> legs;

    /**
     * Fare price in BigDecimal.
     * Strictly NULL when fare data is unavailable from the GTFS source.
     */
    private BigDecimal price;

    /** Currency code, e.g. "MAD". */
    private String currency;

    /** Human-readable freshness notice describing service calendar coverage. */
    private String dataFreshness;

    /** GTFS feed earliest calendar date (e.g. "2024-01-01"). */
    private String feedValidityStart;

    /** GTFS feed latest calendar date (e.g. "2025-12-31"). */
    private String feedValidityEnd;

    /** Official operator link for live timetable verification. */
    private String officialScheduleUrl;
}
