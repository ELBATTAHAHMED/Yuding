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

/**
 * Request DTO for generating static map image bytes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaticMapRequest {

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Latitude must be >= -90.0")
    @DecimalMax(value = "90.0", message = "Latitude must be <= 90.0")
    private Double centerLat;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Longitude must be >= -180.0")
    @DecimalMax(value = "180.0", message = "Longitude must be <= 180.0")
    private Double centerLon;

    @Min(value = 1, message = "Zoom must be at least 1")
    @Max(value = 20, message = "Zoom cannot exceed 20")
    private Integer zoom;

    @Min(value = 200, message = "Width must be at least 200px")
    @Max(value = 1200, message = "Width cannot exceed 1200px")
    private Integer width;

    @Min(value = 150, message = "Height must be at least 150px")
    @Max(value = 1200, message = "Height cannot exceed 1200px")
    private Integer height;

    /**
     * Optional marker string or parameter (e.g. "lonlat:lon,lat;color:#01796F;size:medium").
     */
    private String markers;
}
