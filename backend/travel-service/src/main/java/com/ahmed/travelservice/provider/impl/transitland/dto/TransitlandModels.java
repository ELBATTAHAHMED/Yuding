package com.ahmed.travelservice.provider.impl.transitland.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

public class TransitlandModels {

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FeedResponse {
        private List<FeedItem> feeds;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FeedItem {
        private Long id;
        @JsonProperty("onestop_id")
        private String onestopId;
        private String spec;
        @JsonProperty("feed_versions")
        private List<FeedVersion> feedVersions;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FeedVersion {
        private Long id;
        private String sha1;
        @JsonProperty("earliest_calendar_date")
        private String earliestCalendarDate;
        @JsonProperty("latest_calendar_date")
        private String latestCalendarDate;
        @JsonProperty("fetched_at")
        private String fetchedAt;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StopsResponse {
        private List<StopItem> stops;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StopItem {
        private Long id;
        @JsonProperty("onestop_id")
        private String onestopId;
        @JsonProperty("stop_id")
        private String stopId;
        @JsonProperty("stop_name")
        private String stopName;
        @JsonProperty("location_type")
        private Integer locationType;
        private Geometry geometry;
        @JsonProperty("stop_timezone")
        private String stopTimezone;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Geometry {
        private String type;
        private List<Double> coordinates; // [lon, lat]
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StopDeparturesResponse {
        private List<StopDeparturesItem> stops;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StopDeparturesItem {
        private String onestopId;
        private List<DepartureItem> departures;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DepartureItem {
        @JsonProperty("departure_time")
        private String departureTime;
        @JsonProperty("arrival_time")
        private String arrivalTime;
        @JsonProperty("service_date")
        private String serviceDate;
        @JsonProperty("stop_sequence")
        private Integer stopSequence;
        private TripSummary trip;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TripSummary {
        private Long id;
        @JsonProperty("trip_id")
        private String tripId;
        @JsonProperty("trip_headsign")
        private String tripHeadsign;
        private RouteSummary route;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RouteSummary {
        @JsonProperty("onestop_id")
        private String onestopId;
        @JsonProperty("route_short_name")
        private String routeShortName;
        @JsonProperty("route_long_name")
        private String routeLongName;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TripsResponse {
        private List<TripDetail> trips;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TripDetail {
        private Long id;
        @JsonProperty("trip_id")
        private String tripId;
        @JsonProperty("trip_headsign")
        private String tripHeadsign;
        private CalendarSummary calendar;
        @JsonProperty("stop_times")
        private List<StopTimeItem> stopTimes;
        private RouteSummary route;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CalendarSummary {
        @JsonProperty("start_date")
        private String startDate;
        @JsonProperty("end_date")
        private String endDate;
        private Integer monday;
        private Integer tuesday;
        private Integer wednesday;
        private Integer thursday;
        private Integer friday;
        private Integer saturday;
        private Integer sunday;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StopTimeItem {
        @JsonProperty("stop_sequence")
        private Integer stopSequence;
        @JsonProperty("arrival_time")
        private String arrivalTime;
        @JsonProperty("departure_time")
        private String departureTime;
        private StopItem stop;
    }
}
