package com.ahmed.travelservice.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents per-room occupancy configuration: adult count and explicit children ages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomOccupancyDto {

    @NotNull(message = "Adults count is required for room")
    @Min(value = 1, message = "Each room must have at least 1 adult guest")
    @Max(value = 10, message = "Maximum 10 adults allowed per room")
    @Builder.Default
    private Integer adults = 1;

    @Builder.Default
    private List<@Min(value = 0, message = "Child age must be at least 0")
                 @Max(value = 17, message = "Child age cannot exceed 17") Integer> childrenAges = new ArrayList<>();
}
