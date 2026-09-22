package com.ahmed.travelservice.provider.image;

import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.provider.error.TravelProviderException;

import java.util.List;

/**
 * Provider-neutral interface for external image providers.
 * Adheres to Yuding's swappable provider abstraction pattern.
 */
public interface ImageProvider {

    /**
     * Unique code identifier for this image provider (e.g. "PEXELS").
     */
    String getProviderCode();

    /**
     * Searches contextual travel imagery for a destination.
     *
     * @param request structured destination search criteria
     * @return ordered list of normalized ImageAssetDto objects
     * @throws TravelProviderException on provider failure or rate limits
     */
    List<ImageAssetDto> getDestinationImages(DestinationImageRequest request) throws TravelProviderException;
}
