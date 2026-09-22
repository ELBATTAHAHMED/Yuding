package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.DestinationImagesResponseDto;
import com.ahmed.travelservice.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/**
 * Gateway-routed public REST controller for contextual travel imagery.
 * All third-party provider keys and upstream endpoints remain strictly server-side.
 */
@RestController
@RequestMapping("/travel/images")
@RequiredArgsConstructor
public class TravelImageController {

    private final ImageService imageService;

    /**
     * Get contextual destination imagery based on structured Geo data.
     */
    @GetMapping("/destination")
    public ResponseEntity<DestinationImagesResponseDto> getDestinationImages(
            @RequestParam String city,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String countryCode,
            @RequestParam(required = false) Integer limit) {

        DestinationImageRequest request = DestinationImageRequest.builder()
                .city(city)
                .country(country)
                .countryCode(countryCode)
                .limit(limit)
                .build();

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(imageService.getDestinationImages(request));
    }
}
