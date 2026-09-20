package com.ahmed.travelservice.provider.impl.scrappa.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Search metadata envelope from Scrappa flight responses.
 * Used for observability logging only; never exposed in the public API.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ScrappaSearchMetadata {

    @JsonProperty("api_version")
    private Integer apiVersion;

    /** "outbound" or "return" — indicates the round-trip stage. */
    @JsonProperty("stage")
    private String stage;

    @JsonProperty("origin")
    private String origin;

    @JsonProperty("destination")
    private String destination;

    @JsonProperty("departure_date")
    private String departureDate;

    @JsonProperty("return_date")
    private String returnDate;

    @JsonProperty("currency")
    private String currency;
}
