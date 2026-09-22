package com.ahmed.travelservice.service;

import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.DestinationImagesResponseDto;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.dto.image.ImageRole;
import com.ahmed.travelservice.dto.image.ImageSourceType;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.pexels.PexelsImageProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImageServiceTest {

    @Mock
    private PexelsImageProvider pexelsImageProvider;

    private ImageService imageService;

    @BeforeEach
    void setUp() {
        imageService = new ImageService(pexelsImageProvider);
    }

    @Test
    @DisplayName("returns empty response for null or blank request")
    void returnsEmpty_forBlankRequest() {
        DestinationImagesResponseDto resp1 = imageService.getDestinationImages(null);
        assertThat(resp1.getCount()).isZero();
        assertThat(resp1.getImages()).isEmpty();

        DestinationImagesResponseDto resp2 = imageService.getDestinationImages(
                DestinationImageRequest.builder().city("").build());
        assertThat(resp2.getCount()).isZero();
        assertThat(resp2.getImages()).isEmpty();
    }

    @Test
    @DisplayName("returns images from provider on success")
    void returnsImages_onSuccess() {
        when(pexelsImageProvider.getProviderCode()).thenReturn("PEXELS");

        ImageAssetDto asset = ImageAssetDto.builder()
                .id("pexels-1")
                .url("https://images.pexels.com/photos/1/large.jpg")
                .altText("Paris view")
                .sourceType(ImageSourceType.STOCK_DESTINATION)
                .sourceProvider("PEXELS")
                .role(ImageRole.DESTINATION_HERO)
                .representsEntity(false)
                .build();

        when(pexelsImageProvider.getDestinationImages(any(DestinationImageRequest.class)))
                .thenReturn(List.of(asset));

        DestinationImagesResponseDto response = imageService.getDestinationImages(
                DestinationImageRequest.builder().city("Paris").country("France").build());

        assertThat(response.getDestination()).isEqualTo("Paris, France");
        assertThat(response.getProvider()).isEqualTo("PEXELS");
        assertThat(response.getCount()).isEqualTo(1);
        assertThat(response.getImages()).hasSize(1);
    }

    @Test
    @DisplayName("catches provider exception gracefully and returns empty list")
    void catchesException_gracefully() {
        when(pexelsImageProvider.getProviderCode()).thenReturn("PEXELS");
        when(pexelsImageProvider.getDestinationImages(any(DestinationImageRequest.class)))
                .thenThrow(new TravelProviderException("PEXELS", ProviderErrorCode.PROVIDER_RATE_LIMITED, "Rate limit"));

        DestinationImagesResponseDto response = imageService.getDestinationImages(
                DestinationImageRequest.builder().city("Tokyo").build());

        assertThat(response.getCount()).isZero();
        assertThat(response.getImages()).isEmpty();
    }
}
