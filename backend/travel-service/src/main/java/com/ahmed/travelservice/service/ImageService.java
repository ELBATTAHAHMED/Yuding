package com.ahmed.travelservice.service;

import com.ahmed.travelservice.cache.CacheKeyBuilder;
import com.ahmed.travelservice.cache.ExternalApiCache;
import com.ahmed.travelservice.cache.ExternalApiCacheProperties;
import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.DestinationImagesResponseDto;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.provider.impl.pexels.PexelsImageProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * High-level service managing destination and contextual imagery.
 * Encapsulates validation, fallback logic, and provider error containment
 * so external image issues never disrupt primary travel services.
 * Integrates with ExternalApiCache to protect Pexels API quotas with daily TTL.
 */
@Service
public class ImageService {

    private static final Logger log = LoggerFactory.getLogger(ImageService.class);

    private final PexelsImageProvider pexelsImageProvider;
    private final ExternalApiCache cache;
    private final ExternalApiCacheProperties cacheProperties;

    @Autowired
    public ImageService(PexelsImageProvider pexelsImageProvider,
                        ExternalApiCache cache,
                        ExternalApiCacheProperties cacheProperties) {
        this.pexelsImageProvider = pexelsImageProvider;
        this.cache = cache;
        this.cacheProperties = cacheProperties;
    }

    public ImageService(PexelsImageProvider pexelsImageProvider) {
        this(pexelsImageProvider, null, null);
    }

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

        final String destination = (request.getCountry() != null && !request.getCountry().trim().isBlank())
                ? request.getCity().trim() + ", " + request.getCountry().trim()
                : request.getCity().trim();

        if (cache != null && cache.isEnabled()) {
            String key = CacheKeyBuilder.destinationImages(pexelsImageProvider.getProviderCode(), cacheProperties.getVersion(), request);
            try {
                return cache.getOrLoad(key, DestinationImagesResponseDto.class, cacheProperties.getTtl().getDestinationImages(), () -> {
                    List<ImageAssetDto> images = pexelsImageProvider.getDestinationImages(request);
                    return DestinationImagesResponseDto.builder()
                            .destination(destination)
                            .provider(pexelsImageProvider.getProviderCode())
                            .count(images != null ? images.size() : 0)
                            .images(images != null ? images : Collections.emptyList())
                            .build();
                });
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

        try {
            List<ImageAssetDto> images = pexelsImageProvider.getDestinationImages(request);
            return DestinationImagesResponseDto.builder()
                    .destination(destination)
                    .provider(pexelsImageProvider.getProviderCode())
                    .count(images != null ? images.size() : 0)
                    .images(images != null ? images : Collections.emptyList())
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
