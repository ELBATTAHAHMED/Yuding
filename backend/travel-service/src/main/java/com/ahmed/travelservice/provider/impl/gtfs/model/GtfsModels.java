package com.ahmed.travelservice.provider.impl.gtfs.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;

public final class GtfsModels {

    private GtfsModels() {}

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GtfsAgency {
        private String agencyId;
        private String agencyName;
        private String agencyUrl;
        private String agencyTimezone;
        private String agencyLang;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GtfsStop {
        private String stopId;
        private String stopCode;
        private String stopName;
        private Double stopLat;
        private Double stopLon;
        private Integer locationType; // 0 = stop/platform, 1 = station
        private String parentStation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GtfsRoute {
        private String routeId;
        private String agencyId;
        private String routeShortName;
        private String routeLongName;
        private Integer routeType; // 101 = high-speed, 2 = rail, 202 = coach
        private String routeColor;
        private String routeTextColor;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GtfsTrip {
        private String routeId;
        private String serviceId;
        private String tripId;
        private String tripShortName;
        private String tripHeadsign;
        private Integer directionId;
        private String shapeId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GtfsStopTime {
        private String tripId;
        private String arrivalTime;
        private String departureTime;
        private int arrivalSeconds;   // Seconds from service day start (supports >= 24h)
        private int departureSeconds; // Seconds from service day start (supports >= 24h)
        private String stopId;
        private int stopSequence;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GtfsCalendar {
        private String serviceId;
        private boolean monday;
        private boolean tuesday;
        private boolean wednesday;
        private boolean thursday;
        private boolean friday;
        private boolean saturday;
        private boolean sunday;
        private LocalDate startDate;
        private LocalDate endDate;

        public boolean runsOn(DayOfWeek dayOfWeek) {
            return switch (dayOfWeek) {
                case MONDAY -> monday;
                case TUESDAY -> tuesday;
                case WEDNESDAY -> wednesday;
                case THURSDAY -> thursday;
                case FRIDAY -> friday;
                case SATURDAY -> saturday;
                case SUNDAY -> sunday;
            };
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GtfsCalendarDate {
        private String serviceId;
        private LocalDate date;
        private int exceptionType; // 1 = added service, 2 = removed service
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GtfsFeedInfo {
        private String publisherName;
        private String publisherUrl;
        private String lang;
        private LocalDate startDate;
        private LocalDate endDate;
        private String version;
    }
}
