package com.ahmed.travelservice.service;

import com.ahmed.travelservice.cache.CacheKeyBuilder;
import com.ahmed.travelservice.cache.ExternalApiCache;
import com.ahmed.travelservice.cache.ExternalApiCacheProperties;
import com.ahmed.travelservice.dto.geo.*;
import com.ahmed.travelservice.exception.TravelValidationException;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.geo.GeoProvider;
import com.fasterxml.jackson.core.type.TypeReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Service orchestrating provider-neutral geographic operations:
 * autocomplete, forward/reverse geocoding, nearby POIs, and static map generation.
 * Integrates with centralized ExternalApiCache for quota protection.
 */
@Service
public class TravelGeoService {

    private static final Logger log = LoggerFactory.getLogger(TravelGeoService.class);

    private final GeoProvider geoProvider;
    private final ExternalApiCache cache;
    private final ExternalApiCacheProperties cacheProperties;

    @Autowired
    public TravelGeoService(GeoProvider geoProvider, ExternalApiCache cache, ExternalApiCacheProperties cacheProperties) {
        this.geoProvider = geoProvider;
        this.cache = cache;
        this.cacheProperties = cacheProperties;
    }

    public TravelGeoService(GeoProvider geoProvider) {
        this(geoProvider, null, null);
    }

    public List<GeoPlaceDto> autocomplete(GeoAutocompleteRequest request) {
        if (request == null || request.getText() == null || request.getText().trim().length() < 2) {
            return Collections.emptyList();
        }

        log.debug("TravelGeoService: Autocomplete requested for '{}' (type={})", request.getText(), request.getType());
        if (cache != null && cache.isEnabled()) {
            String key = CacheKeyBuilder.geoAutocomplete(getProviderCode(), cacheProperties.getVersion(), request);
            return cache.getOrLoad(key, new TypeReference<List<GeoPlaceDto>>() {},
                    cacheProperties.getTtl().getGeoAutocomplete(),
                    () -> geoProvider.autocomplete(request));
        }

        try {
            return geoProvider.autocomplete(request);
        } catch (TravelProviderException ex) {
            log.warn("TravelGeoService: Autocomplete failed [code={}]: {}", ex.getErrorCode(), ex.getMessage());
            throw ex;
        }
    }

    public List<GeoPlaceDto> geocode(GeoGeocodeRequest request) {
        if (request == null || request.getText() == null || request.getText().trim().isBlank()) {
            throw new TravelValidationException("text", "Geocode query text must not be empty");
        }

        log.debug("TravelGeoService: Forward geocode requested for '{}'", request.getText());
        if (cache != null && cache.isEnabled()) {
            String key = CacheKeyBuilder.geoGeocode(getProviderCode(), cacheProperties.getVersion(), request);
            return cache.getOrLoad(key, new TypeReference<List<GeoPlaceDto>>() {},
                    cacheProperties.getTtl().getGeoGeocode(),
                    () -> geoProvider.geocode(request));
        }

        try {
            return geoProvider.geocode(request);
        } catch (TravelProviderException ex) {
            log.warn("TravelGeoService: Geocode failed [code={}]: {}", ex.getErrorCode(), ex.getMessage());
            throw ex;
        }
    }

    public GeoPlaceDto reverseGeocode(GeoReverseRequest request) {
        if (request == null || request.getLatitude() == null || request.getLongitude() == null) {
            throw new TravelValidationException("coordinates", "Latitude and Longitude are required for reverse geocoding");
        }
        validateCoordinates(request.getLatitude(), request.getLongitude());

        log.debug("TravelGeoService: Reverse geocode requested for [{}, {}]", request.getLatitude(), request.getLongitude());
        if (cache != null && cache.isEnabled()) {
            String key = CacheKeyBuilder.geoReverse(getProviderCode(), cacheProperties.getVersion(), request);
            return cache.getOrLoad(key, GeoPlaceDto.class,
                    cacheProperties.getTtl().getGeoGeocode(),
                    () -> geoProvider.reverseGeocode(request));
        }

        try {
            return geoProvider.reverseGeocode(request);
        } catch (TravelProviderException ex) {
            log.warn("TravelGeoService: Reverse geocode failed [code={}]: {}", ex.getErrorCode(), ex.getMessage());
            throw ex;
        }
    }

    public List<NearbyPlaceDto> findNearbyPlaces(NearbyPlacesRequest request) {
        if (request == null || request.getLatitude() == null || request.getLongitude() == null) {
            throw new TravelValidationException("coordinates", "Latitude and Longitude are required for nearby places search");
        }
        validateCoordinates(request.getLatitude(), request.getLongitude());

        if (request.getRadiusMeters() != null && (request.getRadiusMeters() < 100 || request.getRadiusMeters() > 50000)) {
            throw new TravelValidationException("radiusMeters", "Search radius must be between 100 and 50,000 meters");
        }

        log.debug("TravelGeoService: Nearby places search for [{}, {}], radius={}m",
                request.getLatitude(), request.getLongitude(), request.getRadiusMeters());
        if (cache != null && cache.isEnabled()) {
            String key = CacheKeyBuilder.geoPoi(getProviderCode(), cacheProperties.getVersion(), request);
            return cache.getOrLoad(key, new TypeReference<List<NearbyPlaceDto>>() {},
                    cacheProperties.getTtl().getGeoPoi(),
                    () -> geoProvider.findNearbyPlaces(request));
        }

        try {
            return geoProvider.findNearbyPlaces(request);
        } catch (TravelProviderException ex) {
            log.warn("TravelGeoService: Nearby places search failed [code={}]: {}", ex.getErrorCode(), ex.getMessage());
            throw ex;
        }
    }

    public byte[] getStaticMap(StaticMapRequest request) {
        if (request == null || request.getCenterLat() == null || request.getCenterLon() == null) {
            throw new TravelValidationException("coordinates", "Center latitude and longitude are required for static map");
        }
        validateCoordinates(request.getCenterLat(), request.getCenterLon());

        try {
            return geoProvider.getStaticMap(request);
        } catch (TravelProviderException ex) {
            log.warn("TravelGeoService: Static map request failed [code={}]: {}", ex.getErrorCode(), ex.getMessage());
            throw ex;
        }
    }

    private String getProviderCode() {
        if (geoProvider != null && geoProvider.getMetadata() != null && geoProvider.getMetadata().getProviderCode() != null) {
            return geoProvider.getMetadata().getProviderCode();
        }
        return "geoapify";
    }

    private void validateCoordinates(Double lat, Double lon) {
        if (lat < -90.0 || lat > 90.0) {
            throw new TravelValidationException("latitude", "Latitude must be between -90.0 and 90.0 degrees");
        }
        if (lon < -180.0 || lon > 180.0) {
            throw new TravelValidationException("longitude", "Longitude must be between -180.0 and 180.0 degrees");
        }
    }
}
