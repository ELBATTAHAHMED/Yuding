package com.ahmed.travelservice.dto.image;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Standard response container for destination imagery.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DestinationImagesResponseDto {

    /** Resolved destination query. */
    private String destination;

    /** Source provider code ("PEXELS", "SYSTEM"). */
    private String provider;

    /** Total images returned. */
    private int count;

    /** List of contextual image assets. */
    private List<ImageAssetDto> images;
}
