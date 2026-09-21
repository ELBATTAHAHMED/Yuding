package com.ahmed.travelservice.dto.geo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeoCoordinatesDto {
    private Double latitude;
    private Double longitude;
}
