package com.ahmed.travelservice.dto.geo;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for nearby Points of Interest (POIs) search.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NearbyPlacesRequest {

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be >= -90.0")
    @DecimalMax(value = "90.0", message = "Latitude must be <= 90.0")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180.0")
    @DecimalMax(value = "180.0", message = "Longitude must be <= 180.0")
    private Double longitude;

    /**
     * Search radius in meters (bounded between 100 and 50,000 meters). Default: 5000.
     */
    @Min(value = 100, message = "Radius must be at least 100 meters")
    @Max(value = 50000, message = "Radius cannot exceed 50,000 meters")
    private Integer radiusMeters;

    /**
     * Provider-neutral or category list (e.g. "attractions", "restaurants", "cafes", "museums", "parks", "shopping", "transport").
     */
    private List<String> categories;

    /**
     * Maximum results (bounded 1 to 50). Default: 20.
     */
    @Min(value = 1, message = "Limit must be at least 1")
    @Max(value = 50, message = "Limit cannot exceed 50")
    private Integer limit;

    /**
     * Preferred language (ISO 639-1 code).
     */
    private String language;
}
