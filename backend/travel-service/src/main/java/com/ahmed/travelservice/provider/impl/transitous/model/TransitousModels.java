package com.ahmed.travelservice.provider.impl.transitous.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Data Transfer Objects for the Transitous REST API (MOTIS v2).
 * Covers both the geocoding (/v1/geocode) and routing plan (/v6/plan) responses.
 */
public final class TransitousModels {

    private TransitousModels() {}

    // =========================================================================
    // Geocode Models (/v1/geocode)
    // =========================================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class GeocodeResult {
        /** Type of location, e.g. "STOP", "PLACE". */
        private String type;
        private String category;
        private String name;
        private String id;
        private Double lat;
        private Double lon;
        private String country;
        private String zip;
        private String tz;
        private List<Area> areas;
        private List<String> modes;
        private Double importance;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Area {
        private String name;
        private Double adminLevel;
        private Boolean matched;
        private Boolean unique;
        @JsonProperty("default")
        private Boolean defaultArea;
    }

    // =========================================================================
    // Plan / Routing Models (/v6/plan)
    // =========================================================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PlanResponse {
        private List<Itinerary> itineraries;
        private String previousPageCursor;
        private String nextPageCursor;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Itinerary {
        /** Total travel duration in seconds. */
        private Long duration;
        private String startTime;
        private String endTime;
        private String scheduledStartTime;
        private String scheduledEndTime;
        /** Number of transit interchanges. */
        private Integer transfers;
        private List<Leg> legs;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Leg {
        /** Transport mode: HIGHSPEED_RAIL, LONG_DISTANCE, REGIONAL_RAIL, RAIL, WALK, TRAM, SUBWAY, etc. */
        private String mode;
        private StopPlace from;
        private StopPlace to;
        /** Leg duration in seconds. */
        private Long duration;
        private String startTime;
        private String endTime;
        private String scheduledStartTime;
        private String scheduledEndTime;
        private Boolean realTime;
        private Boolean scheduled;
        private Double distance;
        private String routeShortName;
        private String routeLongName;
        private String tripShortName;
        private String displayName;
        private String agencyName;
        private String agencyUrl;
        private String agencyId;
        private String tripId;
        private List<StopPlace> intermediateStops;
        private Boolean cancelled;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StopPlace {
        private String name;
        private String stopId;
        private String parentId;
        private Double lat;
        private Double lon;
        private String tz;
        private String arrival;
        private String departure;
        private String scheduledArrival;
        private String scheduledDeparture;
        private Boolean cancelled;
        private List<String> modes;
    }
}
