package com.ahmed.travelservice.dto.geo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for forward geocoding (text address -> coordinates).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoGeocodeRequest {

    @NotBlank(message = "Geocode query text must not be blank")
    @Size(min = 2, max = 200, message = "Geocode query text must be between 2 and 200 characters")
    private String text;

    private String language;

    private String country;

    private Integer limit;
}
