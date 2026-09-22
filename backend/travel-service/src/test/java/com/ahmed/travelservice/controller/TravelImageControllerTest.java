package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.DestinationImagesResponseDto;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.dto.image.ImageRole;
import com.ahmed.travelservice.dto.image.ImageSourceType;
import com.ahmed.travelservice.service.ImageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
class TravelImageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ImageService imageService;

    @Test
    @DisplayName("GET /travel/images/destination is public and returns normalized destination images with attribution")
    void destinationEndpoint_isPublicAndReturnsImages() throws Exception {
        ImageAssetDto asset = ImageAssetDto.builder()
                .id("pexels-123")
                .url("https://images.pexels.com/photos/123/large.jpg")
                .thumbnailUrl("https://images.pexels.com/photos/123/medium.jpg")
                .altText("Marrakech panorama")
                .sourceType(ImageSourceType.STOCK_DESTINATION)
                .sourceProvider("PEXELS")
                .photographerName("Karim")
                .attributionText("Photo par Karim sur Pexels")
                .attributionUrl("https://www.pexels.com/photo/123")
                .role(ImageRole.DESTINATION_HERO)
                .representsEntity(false)
                .build();

        DestinationImagesResponseDto response = DestinationImagesResponseDto.builder()
                .destination("Marrakech, Morocco")
                .provider("PEXELS")
                .count(1)
                .images(List.of(asset))
                .build();

        when(imageService.getDestinationImages(any(DestinationImageRequest.class)))
                .thenReturn(response);

        mockMvc.perform(get("/travel/images/destination")
                        .param("city", "Marrakech")
                        .param("country", "Morocco")
                        .param("limit", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider", is("PEXELS")))
                .andExpect(jsonPath("$.destination", is("Marrakech, Morocco")))
                .andExpect(jsonPath("$.count", is(1)))
                .andExpect(jsonPath("$.images", hasSize(1)))
                .andExpect(jsonPath("$.images[0].sourceType", is("STOCK_DESTINATION")))
                .andExpect(jsonPath("$.images[0].representsEntity", is(false)))
                .andExpect(jsonPath("$.images[0].attributionText", is("Photo par Karim sur Pexels")))
                .andExpect(header().string("Cache-Control", containsString("max-age=3600")));
    }
}
