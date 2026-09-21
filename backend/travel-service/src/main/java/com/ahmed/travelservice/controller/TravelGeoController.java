package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.geo.*;
import com.ahmed.travelservice.service.TravelGeoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;

/**
 * REST controller exposing provider-neutral Geo & Places endpoints (/travel/geo/**).
 * Publicly routed through the API Gateway on port 8888.
 */
@RestController
@RequestMapping("/travel/geo")
@RequiredArgsConstructor
public class TravelGeoController {

    private final TravelGeoService geoService;

    /**
     * Autocomplete city and place names.
     */
    @GetMapping("/autocomplete")
    public ResponseEntity<List<GeoPlaceDto>> autocomplete(
            @RequestParam String text,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Double biasLat,
            @RequestParam(required = false) Double biasLon) {

        GeoAutocompleteRequest request = GeoAutocompleteRequest.builder()
                .text(text)
                .type(type)
                .language(language)
                .country(country)
                .limit(limit)
                .biasLat(biasLat)
                .biasLon(biasLon)
                .build();

        return ResponseEntity.ok(geoService.autocomplete(request));
    }

    /**
     * Forward geocode address / place string to coordinates and structured location.
     */
    @GetMapping("/geocode")
    public ResponseEntity<List<GeoPlaceDto>> geocode(
            @RequestParam String text,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Integer limit) {

        GeoGeocodeRequest request = GeoGeocodeRequest.builder()
                .text(text)
                .language(language)
                .country(country)
                .limit(limit)
                .build();

        return ResponseEntity.ok(geoService.geocode(request));
    }

    /**
     * Reverse geocode coordinates to structured place.
     */
    @GetMapping("/reverse")
    public ResponseEntity<GeoPlaceDto> reverseGeocode(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(required = false) String language) {

        GeoReverseRequest request = GeoReverseRequest.builder()
                .latitude(lat)
                .longitude(lon)
                .language(language)
                .build();

        GeoPlaceDto result = geoService.reverseGeocode(request);
        return result != null ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
    }

    /**
     * Search nearby Points of Interest (attractions, restaurants, museums, etc.).
     */
    @GetMapping("/places/nearby")
    public ResponseEntity<List<NearbyPlaceDto>> findNearbyPlaces(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(required = false, defaultValue = "5000") Integer radius,
            @RequestParam(required = false) List<String> categories,
            @RequestParam(required = false, defaultValue = "20") Integer limit,
            @RequestParam(required = false) String language) {

        NearbyPlacesRequest request = NearbyPlacesRequest.builder()
                .latitude(lat)
                .longitude(lon)
                .radiusMeters(radius)
                .categories(categories)
                .limit(limit)
                .language(language)
                .build();

        return ResponseEntity.ok(geoService.findNearbyPlaces(request));
    }

    /**
     * Proxied static map image with custom center, zoom, and markers.
     * Prevents client API key leakage.
     */
    @GetMapping(value = "/map/static", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getStaticMap(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(required = false, defaultValue = "13") Integer zoom,
            @RequestParam(required = false, defaultValue = "600") Integer width,
            @RequestParam(required = false, defaultValue = "400") Integer height,
            @RequestParam(required = false) String markers) {

        StaticMapRequest request = StaticMapRequest.builder()
                .centerLat(lat)
                .centerLon(lon)
                .zoom(zoom)
                .width(width)
                .height(height)
                .markers(markers)
                .build();

        byte[] imageBytes = geoService.getStaticMap(request);

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.maxAge(Duration.ofHours(24)).cachePublic())
                .body(imageBytes);
    }
}
