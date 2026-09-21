package com.ahmed.travelservice.dto.geo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for place and city autocompletion.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoAutocompleteRequest {

    @NotBlank(message = "Search text must not be blank")
    @Size(min = 2, max = 100, message = "Search text must be between 2 and 100 characters")
    private String text;

    /**
     * Optional result type filter, e.g. "city", "amenity", "street".
     */
    private String type;

    /**
     * Preferred language (ISO 639-1 code, e.g. "en", "fr").
     */
    private String language;

    /**
     * Optional comma-separated ISO 3166-1 alpha-2 country codes filter (e.g. "ma,fr,es").
     */
    private String country;

    /**
     * Maximum number of suggestions to return (bounded 1 to 20).
     */
    private Integer limit;

    /**
     * Optional bias latitude for proximity-based ranking.
     */
    private Double biasLat;

    /**
     * Optional bias longitude for proximity-based ranking.
     */
    private Double biasLon;
}
