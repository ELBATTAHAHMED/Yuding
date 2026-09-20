package com.ahmed.travelservice.provider.impl.scrappa.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

/**
 * Top-level response from GET /flights/airports.
 * Shape: { "airports": [ ... ] }
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScrappaAirportsResponse {

    @JsonProperty("airports")
    private List<ScrappaAirport> airports;

    public List<ScrappaAirport> safeAirports() {
        return airports != null ? airports : Collections.emptyList();
    }
}
