package com.ahmed.travelservice.provider.impl.nuitee.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class NuiteeHotelData {
    private String id;
    private String name;
    @JsonProperty("main_photo")
    private String mainPhoto;
    private String thumbnail;
    private String address;
    @JsonProperty("country_code")
    private String countryCode;
    @JsonProperty("city_name")
    private String cityName;
    private Double latitude;
    private Double longitude;
    private Double rating;
    private Double stars;
    @JsonProperty("review_count")
    private Integer reviewCount;
    private List<String> tags;
    private String persona;
    private String style;
    private String story;
}
