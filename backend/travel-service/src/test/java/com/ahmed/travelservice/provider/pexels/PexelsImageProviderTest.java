package com.ahmed.travelservice.provider.pexels;

import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.dto.image.ImageRole;
import com.ahmed.travelservice.dto.image.ImageSourceType;
import com.ahmed.travelservice.provider.impl.pexels.PexelsClient;
import com.ahmed.travelservice.provider.impl.pexels.PexelsImageProvider;
import com.ahmed.travelservice.provider.impl.pexels.model.PexelsModels.PexelsPhoto;
import com.ahmed.travelservice.provider.impl.pexels.model.PexelsModels.PexelsPhotoSrc;
import com.ahmed.travelservice.provider.impl.pexels.model.PexelsModels.PexelsSearchResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PexelsImageProviderTest {

    @Mock
    private PexelsClient pexelsClient;

    private PexelsImageProvider provider;

    @BeforeEach
    void setUp() {
        provider = new PexelsImageProvider(pexelsClient);
    }

    @Test
    @DisplayName("getDestinationImages normalizes photos with STOCK_DESTINATION provenance and representsEntity=false")
    void getDestinationImages_normalizesWithProvenance() {
        PexelsPhoto photo1 = new PexelsPhoto();
        photo1.setId(101L);
        photo1.setWidth(1920);
        photo1.setHeight(1080);
        photo1.setUrl("https://www.pexels.com/photo/101");
        photo1.setPhotographer("Amine Lahlou");
        photo1.setPhotographerUrl("https://www.pexels.com/@amine");
        photo1.setAlt("Vue des jardins Majorelle");

        PexelsPhotoSrc src1 = new PexelsPhotoSrc();
        src1.setLarge2x("https://images.pexels.com/photos/101/large2x.jpg");
        src1.setMedium("https://images.pexels.com/photos/101/medium.jpg");
        photo1.setSrc(src1);

        PexelsPhoto photo2 = new PexelsPhoto();
        photo2.setId(102L);
        photo2.setUrl("https://www.pexels.com/photo/102");
        photo2.setPhotographer("Sofia Martin");
        photo2.setPhotographerUrl("https://www.pexels.com/@sofia");

        PexelsPhotoSrc src2 = new PexelsPhotoSrc();
        src2.setLarge("https://images.pexels.com/photos/102/large.jpg");
        src2.setSmall("https://images.pexels.com/photos/102/small.jpg");
        photo2.setSrc(src2);

        PexelsSearchResponse mockResponse = new PexelsSearchResponse();
        mockResponse.setPhotos(List.of(photo1, photo2));

        when(pexelsClient.searchPhotos(eq("Marrakech Morocco travel"), eq("landscape"), eq(2), anyInt()))
                .thenReturn(mockResponse);

        DestinationImageRequest request = DestinationImageRequest.builder()
                .city("Marrakech")
                .country("Morocco")
                .limit(2)
                .build();

        List<ImageAssetDto> result = provider.getDestinationImages(request);

        assertThat(result).hasSize(2);

        // First image = DESTINATION_HERO
        ImageAssetDto hero = result.get(0);
        assertThat(hero.getId()).isEqualTo("pexels-101");
        assertThat(hero.getUrl()).isEqualTo("https://images.pexels.com/photos/101/large2x.jpg");
        assertThat(hero.getThumbnailUrl()).isEqualTo("https://images.pexels.com/photos/101/medium.jpg");
        assertThat(hero.getSourceType()).isEqualTo(ImageSourceType.STOCK_DESTINATION);
        assertThat(hero.getSourceProvider()).isEqualTo("PEXELS");
        assertThat(hero.isRepresentsEntity()).isFalse(); // Crucial truth invariant
        assertThat(hero.getRole()).isEqualTo(ImageRole.DESTINATION_HERO);
        assertThat(hero.getPhotographerName()).isEqualTo("Amine Lahlou");
        assertThat(hero.getAttributionText()).isEqualTo("Photo par Amine Lahlou sur Pexels");
        assertThat(hero.getAttributionUrl()).isEqualTo("https://www.pexels.com/photo/101");

        // Second image = DESTINATION_GALLERY
        ImageAssetDto gallery = result.get(1);
        assertThat(gallery.getId()).isEqualTo("pexels-102");
        assertThat(gallery.getRole()).isEqualTo(ImageRole.DESTINATION_GALLERY);
        assertThat(gallery.getSourceType()).isEqualTo(ImageSourceType.STOCK_DESTINATION);
        assertThat(gallery.isRepresentsEntity()).isFalse();
    }

    @Test
    @DisplayName("returns empty list when request has empty city")
    void returnsEmpty_whenCityEmpty() {
        DestinationImageRequest request = DestinationImageRequest.builder()
                .city("   ")
                .build();

        List<ImageAssetDto> result = provider.getDestinationImages(request);
        assertThat(result).isEmpty();
    }
}
