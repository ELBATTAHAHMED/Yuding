package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Information about an intermediate or terminal station stop along a train route.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainStopDto {
    private int stopSequence;
    private String stationId;
    private String stationName;
    private String arrivalTime;
    private String departureTime;
}
