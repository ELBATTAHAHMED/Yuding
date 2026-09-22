package com.ahmed.travelservice.service;

import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.DestinationImagesResponseDto;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.provider.impl.pexels.PexelsImageProvider;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * High-level service managing destination and contextual imagery.
 * Encapsulates validation, fallback logic, and provider error containment
 * so external image issues never disrupt primary travel services.
 */
@Service
@RequiredArgsConstructor
public class ImageService {

    private static final Logger log = LoggerFactory.getLogger(ImageService.class);

    private final PexelsImageProvider pexelsImageProvider;

    /**
     * Retrieves contextual destination imagery.
     * Guaranteed never to throw uncaught provider exceptions to the client.
     */
    public DestinationImagesResponseDto getDestinationImages(DestinationImageRequest request) {
        if (request == null || request.getCity() == null || request.getCity().trim().isBlank()) {
            return DestinationImagesResponseDto.builder()
                    .destination("")
                    .provider(pexelsImageProvider.getProviderCode())
                    .count(0)
                    .images(Collections.emptyList())
                    .build();
        }

        String destination = request.getCity().trim();
        if (request.getCountry() != null && !request.getCountry().trim().isBlank()) {
            destination = destination + ", " + request.getCountry().trim();
        }

        try {
            List<ImageAssetDto> images = pexelsImageProvider.getDestinationImages(request);
            return DestinationImagesResponseDto.builder()
                    .destination(destination)
                    .provider(pexelsImageProvider.getProviderCode())
                    .count(images.size())
                    .images(images)
                    .build();
        } catch (Exception ex) {
            log.warn("Failed to retrieve destination images for '{}': {}", destination, ex.getMessage());
            return DestinationImagesResponseDto.builder()
                    .destination(destination)
                    .provider(pexelsImageProvider.getProviderCode())
                    .count(0)
                    .images(Collections.emptyList())
                    .build();
        }
    }
}
