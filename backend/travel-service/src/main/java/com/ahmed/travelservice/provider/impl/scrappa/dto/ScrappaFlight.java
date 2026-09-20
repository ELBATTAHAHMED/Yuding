package com.ahmed.travelservice.provider.impl.scrappa.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * A single flight result from the Scrappa Google Flights API.
 * Used for both one-way responses (flights[]) and round-trip outbound/return entries.
 * Unknown fields silently ignored.
 *
 * NOTE: 'price' is declared as BigDecimal to preserve monetary precision.
 * Scrappa returns it as a JSON number — Jackson maps it to BigDecimal correctly
 * when configured with DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS or
 * when the field type is explicitly BigDecimal.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScrappaFlight {

    /** For round-trip responses: "round_trip". Null for one-way. */
    @JsonProperty("trip_type")
    private String tripType;

    /** false = outbound only (starting_price stage). true = complete itinerary. */
    @JsonProperty("itinerary_complete")
    private Boolean itineraryComplete;

    /**
     * "round_trip_starting" or "round_trip_total" for round-trip;
     * null/absent for one-way flights.
     */
    @JsonProperty("price_type")
    private String priceType;

    /**
     * Opaque token to use in second round-trip call to get return flights for this outbound.
     * Only present in first-stage round-trip responses.
     */
    @JsonProperty("departure_token")
    private String departureToken;

    /** Bookable token (future use). Currently null in most responses. */
    @JsonProperty("booking_token")
    private String bookingToken;

    /** Price in the requested currency. BigDecimal for precision. */
    @JsonProperty("price")
    private BigDecimal price;

    @JsonProperty("currency")
    private String currency;

    /** Total stops across all legs (one-way). Null in round-trip outbound stage. */
    @JsonProperty("stops")
    private Integer stops;

    /** Outbound leg stop count (round-trip only). */
    @JsonProperty("outbound_stops")
    private Integer outboundStops;

    /** Return leg stop count (round-trip second stage only). */
    @JsonProperty("return_stops")
    private Integer returnStops;

    /** Total itinerary duration in minutes. Null in outbound-only stage. */
    @JsonProperty("total_duration_minutes")
    private Integer totalDurationMinutes;

    /** Outbound leg duration in minutes. */
    @JsonProperty("outbound_duration_minutes")
    private Integer outboundDurationMinutes;

    /** Return leg duration in minutes (round-trip second stage only). */
    @JsonProperty("return_duration_minutes")
    private Integer returnDurationMinutes;

    /**
     * All legs for one-way; or outbound legs for round-trip outbound stage.
     * May duplicate outbound_legs in round-trip responses.
     */
    @JsonProperty("legs")
    private List<ScrappaLeg> legs;

    /** Outbound legs — explicitly separated in round-trip responses. */
    @JsonProperty("outbound_legs")
    private List<ScrappaLeg> outboundLegs;

    /** Return legs — only present in round-trip second stage. */
    @JsonProperty("return_legs")
    private List<ScrappaLeg> returnLegs;
}
