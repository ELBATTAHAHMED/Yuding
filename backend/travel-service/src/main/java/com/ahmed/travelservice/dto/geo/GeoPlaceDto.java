package com.ahmed.travelservice.dto.geo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Provider-neutral representation of a geographic place or city.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoPlaceDto {
    private String id;
    private String provider;
    private String name;
    private String formatted;
    private String type; // e.g. "city", "amenity", "street", "country"
    private String city;
    private String state;
    private String country;
    private String countryCode;
    private String postcode;
    private Double latitude;
    private Double longitude;
}
