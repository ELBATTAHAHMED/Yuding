package com.ahmed.travelservice.dto.image;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request criteria for fetching contextual destination imagery.
 * Built from structured Phase 26 Geo data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DestinationImageRequest {

    /** Structured city name (e.g. "Marrakech", "Paris"). Required. */
    private String city;

    /** Optional country name (e.g. "Morocco", "France"). */
    private String country;

    /** Optional ISO 3166-1 alpha-2 country code (e.g. "MA", "FR"). */
    private String countryCode;

    /** Number of photos requested (default: 3, clamped between 1 and 10). */
    private Integer limit;
}
