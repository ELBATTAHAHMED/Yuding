package com.ahmed.travelservice.provider.impl.pexels;

import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.dto.image.ImageRole;
import com.ahmed.travelservice.dto.image.ImageSourceType;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.image.ImageProvider;
import com.ahmed.travelservice.provider.impl.pexels.model.PexelsModels.PexelsPhoto;
import com.ahmed.travelservice.provider.impl.pexels.model.PexelsModels.PexelsSearchResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Pexels implementation of the provider-neutral ImageProvider.
 * Fetches contextual travel imagery and normalizes it into ImageAssetDto instances
 * with full attribution and explicit STOCK_DESTINATION provenance.
 */
@Component
@RequiredArgsConstructor
public class PexelsImageProvider implements ImageProvider {

    private static final Logger log = LoggerFactory.getLogger(PexelsImageProvider.class);
    public static final String PROVIDER_CODE = "PEXELS";

    private final PexelsClient pexelsClient;

    @Override
    public String getProviderCode() {
        return PROVIDER_CODE;
    }

    @Override
    public List<ImageAssetDto> getDestinationImages(DestinationImageRequest request) {
        if (request == null || request.getCity() == null || request.getCity().trim().isBlank()) {
            return Collections.emptyList();
        }

        String query = buildDeterministicQuery(request);
        int limit = request.getLimit() != null && request.getLimit() > 0 ? Math.min(request.getLimit(), 10) : 3;

        try {
            PexelsSearchResponse response = pexelsClient.searchPhotos(query, "landscape", limit, 1);
            if (response == null || response.getPhotos() == null || response.getPhotos().isEmpty()) {
                log.info("Pexels returned zero photos for query '{}'", query);
                return Collections.emptyList();
            }

            List<ImageAssetDto> assets = new ArrayList<>();
            for (int i = 0; i < response.getPhotos().size(); i++) {
                PexelsPhoto photo = response.getPhotos().get(i);
                ImageAssetDto asset = mapPhotoToAsset(photo, request.getCity(), i == 0 ? ImageRole.DESTINATION_HERO : ImageRole.DESTINATION_GALLERY);
                if (asset != null) {
                    assets.add(asset);
                }
            }

            return assets;
        } catch (com.ahmed.travelservice.provider.error.TravelProviderException ex) {
            log.warn("Pexels travel provider error for query '{}': {}", query, ex.getMessage());
            // Re-wrap to checked/domain exception or let callers handle gracefully
            throw ex;
        }
    }

    private String buildDeterministicQuery(DestinationImageRequest request) {
        String city = request.getCity().trim();
        if (request.getCountry() != null && !request.getCountry().trim().isBlank()) {
            return city + " " + request.getCountry().trim() + " travel";
        }
        return city + " travel";
    }

    private ImageAssetDto mapPhotoToAsset(PexelsPhoto photo, String city, ImageRole role) {
        if (photo == null || photo.getSrc() == null) {
            return null;
        }

        String highResUrl = photo.getSrc().getLarge2x() != null ? photo.getSrc().getLarge2x()
                : (photo.getSrc().getLarge() != null ? photo.getSrc().getLarge() : photo.getSrc().getOriginal());
        String thumbUrl = photo.getSrc().getMedium() != null ? photo.getSrc().getMedium()
                : photo.getSrc().getSmall();

        if (highResUrl == null) {
            return null;
        }

        String photographer = photo.getPhotographer() != null ? photo.getPhotographer().trim() : "Photographe";
        String altText = photo.getAlt() != null && !photo.getAlt().trim().isBlank()
                ? photo.getAlt().trim()
                : "Photo d'ambiance de " + city;

        return ImageAssetDto.builder()
                .id("pexels-" + photo.getId())
                .url(highResUrl)
                .thumbnailUrl(thumbUrl)
                .width(photo.getWidth())
                .height(photo.getHeight())
                .altText(altText)
                .sourceType(ImageSourceType.STOCK_DESTINATION)
                .sourceProvider(PROVIDER_CODE)
                .sourceAssetId(photo.getId() != null ? String.valueOf(photo.getId()) : null)
                .sourcePageUrl(photo.getUrl())
                .photographerName(photographer)
                .photographerUrl(photo.getPhotographerUrl())
                .attributionText("Photo par " + photographer + " sur Pexels")
                .attributionUrl(photo.getUrl())
                .role(role)
                .representsEntity(false) // Never misrepresent a destination stock image as a hotel/activity entity
                .build();
    }
}
