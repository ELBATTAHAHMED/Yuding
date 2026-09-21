package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Provider-neutral representation of a railway station for search and autocomplete.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainStationDto {
    /** Canonical station ID / code, e.g. "CASA_VOYAGEURS" or Transitland onestop ID. */
    private String id;

    /** Transitland onestop ID if present, e.g. "s-evfx4s7cyn-casa~voyageurs". */
    private String onestopId;

    /** Canonical station name, e.g. "Casa-Voyageurs". */
    private String name;

    /** City where the station is situated. */
    private String city;

    /** Country where the station is located. */
    private String country;

    /** ISO 3166-1 alpha-2 country code, e.g. "MA", "FR", "ES", "DE". */
    private String countryCode;

    /** Provider code offering this station, e.g. "ONCF_GTFS", "TRANSITOUS". */
    private String provider;

    /** Location type classification, e.g. "STATION", "STOP", "CITY", "PLACE". */
    private String locationType;

    /** Geographic latitude. */
    private Double latitude;

    /** Geographic longitude. */
    private Double longitude;

    /** Station timezone if provided. */
    private String timezone;
}
