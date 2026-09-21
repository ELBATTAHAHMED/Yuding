package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Provider-neutral normalized flight offer returned to the Yuding frontend.
 * Extended in Phase 22 with Scrappa-informed fields for duration, stops, round-trip state, and legs.
 * Money fields use BigDecimal exclusively — never float/double.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlightOfferDto {
    /** Yuding search-result reference ID (opaque, not a bookable provider token). */
    private String offerId;

    /** Provider code, e.g. "SCRAPPA". */
    private String provider;

    /** IATA airline code of the first/primary leg carrier (e.g. "AT"). */
    private String airlineCode;

    /** Human-readable airline name of the first/primary leg carrier (e.g. "Royal Air Maroc"). */
    private String airlineName;

    /** Flight number of the first/primary leg (e.g. "703"). */
    private String flightNumber;

    /** IATA origin airport code (e.g. "CMN"). */
    private String origin;

    /** IATA destination airport code (e.g. "CDG"). */
    private String destination;

    /** Departure timestamp — ISO-8601 local string as returned by provider. */
    private String departureTime;

    /** Arrival timestamp — ISO-8601 local string as returned by provider. */
    private String arrivalTime;

    /** Cabin class name (e.g. "economy", "business"). */
    private String cabinClass;

    /** Offer price. MUST be BigDecimal. Never float/double. */
    private BigDecimal price;

    /** ISO currency code (e.g. "EUR", "USD"). */
    private String currency;

    /** Immutable raw-provider/display conversion snapshot; price and currency remain provider values. */
    private PriceConversionSnapshot priceConversion;

    /** Available seats, if provided by the provider. May be null. */
    private Integer availableSeats;

    // ─── Phase 22 Scrappa extensions ─────────────────────────────────────────

    /** Total journey duration in minutes across all legs. Null if unknown. */
    private Integer totalDurationMinutes;

    /**
     * Total number of stops across all legs.
     * 0 = nonstop. Null if not yet resolved (round-trip outbound stage).
     */
    private Integer stops;

    /**
     * Whether this offer represents a complete round-trip itinerary.
     * false = outbound only (starting price). true = outbound + return selected.
     * Always true for one-way flights.
     */
    private Boolean itineraryComplete;

    /**
     * Price type from provider.
     * Scrappa values: null (one-way), "round_trip_starting", "round_trip_total".
     */
    private String priceType;

    /**
     * Opaque departure token from provider used to select this outbound flight and request return flights.
     * Only meaningful for round-trip first-stage responses. NOT a bookable token.
     */
    private String departureToken;

    /**
     * Individual flight legs (segments) for this offer.
     * For one-way, contains all legs. For round-trip outbound, contains outbound legs only.
     */
    private List<FlightLegDto> legs;
}
