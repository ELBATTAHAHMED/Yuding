package com.ahmed.travelservice.provider.impl.pexels.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/**
 * Internal Jackson DTOs mapping raw responses from the Pexels REST API (v1).
 * Strictly isolated to the Pexels provider package.
 */
public final class PexelsModels {

    private PexelsModels() {}

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PexelsSearchResponse {
        @JsonProperty("total_results")
        private Integer totalResults;

        @JsonProperty("page")
        private Integer page;

        @JsonProperty("per_page")
        private Integer perPage;

        @JsonProperty("photos")
        private List<PexelsPhoto> photos;

        @JsonProperty("next_page")
        private String nextPage;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PexelsPhoto {
        @JsonProperty("id")
        private Long id;

        @JsonProperty("width")
        private Integer width;

        @JsonProperty("height")
        private Integer height;

        @JsonProperty("url")
        private String url;

        @JsonProperty("photographer")
        private String photographer;

        @JsonProperty("photographer_url")
        private String photographerUrl;

        @JsonProperty("photographer_id")
        private Long photographerId;

        @JsonProperty("avg_color")
        private String avgColor;

        @JsonProperty("src")
        private PexelsPhotoSrc src;

        @JsonProperty("alt")
        private String alt;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PexelsPhotoSrc {
        @JsonProperty("original")
        private String original;

        @JsonProperty("large2x")
        private String large2x;

        @JsonProperty("large")
        private String large;

        @JsonProperty("medium")
        private String medium;

        @JsonProperty("small")
        private String small;

        @JsonProperty("portrait")
        private String portrait;

        @JsonProperty("landscape")
        private String landscape;

        @JsonProperty("tiny")
        private String tiny;
    }
}
