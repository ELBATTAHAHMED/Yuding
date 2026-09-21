package com.ahmed.travelservice.dto.geo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Provider-neutral representation of a Point of Interest (POI).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyPlaceDto {
    private String id;
    private String provider;
    private String name;
    /**
     * Primary normalized category: "attractions", "museums", "restaurants", "cafes", "parks", "shopping", "transport", or "other".
     */
    private String category;
    private List<String> rawCategories;
    private String formattedAddress;
    private Integer distanceMeters;
    private Double latitude;
    private Double longitude;
    private String city;
    private String country;
}
