package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Clean, provider-neutral airport representation exposed to the Yuding frontend.
 * Used for airport search, autocomplete, and selection.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AirportDto {
    /** 3-letter IATA code, e.g. "CMN", "CDG". */
    private String code;

    /** Human-readable airport name, e.g. "Mohammed V International Airport". */
    private String name;

    /** City served by the airport, e.g. "Casablanca". */
    private String city;

    /** Country where the airport is located, e.g. "Morocco". */
    private String country;

    /** Geographical latitude for transfer/location routing. */
    private Double latitude;

    /** Geographical longitude for transfer/location routing. */
    private Double longitude;

    /** Geographical latitude of the city center served by this airport. */
    private Double cityLatitude;

    /** Geographical longitude of the city center served by this airport. */
    private Double cityLongitude;
}
