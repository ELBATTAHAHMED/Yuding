package com.ahmed.travelservice.provider.impl.geoapify.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Internal Jackson DTOs mapping official Geoapify GeoJSON responses.
 */
public class GeoapifyModels {

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FeatureCollection {
        private String type;
        private List<Feature> features;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Feature {
        private String type;
        private Properties properties;
        private Geometry geometry;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Properties {
        @JsonProperty("place_id")
        private String placeId;

        private String name;
        private String formatted;

        @JsonProperty("result_type")
        private String resultType;

        private String city;
        private String state;
        private String country;

        @JsonProperty("country_code")
        private String countryCode;

        private String postcode;
        private Double lat;
        private Double lon;

        private List<String> categories;
        private Integer distance;

        @JsonProperty("address_line1")
        private String addressLine1;

        @JsonProperty("address_line2")
        private String addressLine2;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Geometry {
        private String type;
        private List<Double> coordinates; // [lon, lat]
    }
}
