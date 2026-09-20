package com.ahmed.travelservice.provider.impl.scrappa.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

/**
 * Top-level response envelope for both Scrappa one-way and round-trip flight responses.
 * Shape: { "flights": [...], "search_metadata": {...} }
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScrappaFlightResponse {

    @JsonProperty("flights")
    private List<ScrappaFlight> flights;

    @JsonProperty("search_metadata")
    private ScrappaSearchMetadata searchMetadata;

    public List<ScrappaFlight> safeFlights() {
        return flights != null ? flights : Collections.emptyList();
    }
}
