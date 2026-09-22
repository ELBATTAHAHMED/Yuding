package com.ahmed.travelservice.service;

import com.ahmed.travelservice.cache.CacheKeyBuilder;
import com.ahmed.travelservice.cache.ExternalApiCache;
import com.ahmed.travelservice.cache.ExternalApiCacheProperties;
import com.ahmed.travelservice.config.OpenMeteoProperties;
import com.ahmed.travelservice.dto.weather.WeatherResponseDto;
import com.ahmed.travelservice.exception.TravelValidationException;
import com.ahmed.travelservice.provider.weather.WeatherProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Validates weather requests before delegating to the configured weather provider.
 * Integrates with ExternalApiCache to protect Open-Meteo quotas with short TTL.
 */
@Service
public class WeatherService {
    private static final int MIN_FORECAST_DAYS = 1;
    private static final int MAX_FORECAST_DAYS = 16;

    private final WeatherProvider weatherProvider;
    private final OpenMeteoProperties properties;
    private final ExternalApiCache cache;
    private final ExternalApiCacheProperties cacheProperties;

    @Autowired
    public WeatherService(WeatherProvider weatherProvider, OpenMeteoProperties properties,
                          ExternalApiCache cache, ExternalApiCacheProperties cacheProperties) {
        this.weatherProvider = weatherProvider;
        this.properties = properties;
        this.cache = cache;
        this.cacheProperties = cacheProperties;
    }

    public WeatherService(WeatherProvider weatherProvider, OpenMeteoProperties properties) {
        this(weatherProvider, properties, null, null);
    }

    public WeatherResponseDto getWeather(Double latitude, Double longitude, Integer forecastDays) {
        validateCoordinates(latitude, longitude);
        int days = forecastDays == null ? properties.getForecastDays() : forecastDays;
        if (days < MIN_FORECAST_DAYS || days > MAX_FORECAST_DAYS) {
            throw new TravelValidationException("INVALID_FORECAST_DAYS", "forecastDays",
                    "forecastDays must be between 1 and 16 days");
        }

        if (cache != null && cache.isEnabled()) {
            String providerCode = (weatherProvider != null && weatherProvider.getMetadata() != null)
                    ? weatherProvider.getMetadata().getProviderCode()
                    : "openmeteo";
            String key = CacheKeyBuilder.weather(providerCode, cacheProperties.getVersion(), latitude, longitude, days);
            return cache.getOrLoad(key, WeatherResponseDto.class, cacheProperties.getTtl().getWeather(),
                    () -> weatherProvider.getWeather(latitude, longitude, days));
        }

        return weatherProvider.getWeather(latitude, longitude, days);
    }

    private void validateCoordinates(Double latitude, Double longitude) {
        if (latitude == null) {
            throw new TravelValidationException("INVALID_LATITUDE", "lat", "Latitude is required");
        }
        if (longitude == null) {
            throw new TravelValidationException("INVALID_LONGITUDE", "lon", "Longitude is required");
        }
        if (!Double.isFinite(latitude) || latitude < -90.0 || latitude > 90.0) {
            throw new TravelValidationException("INVALID_LATITUDE", "lat", "Latitude must be between -90.0 and 90.0 degrees");
        }
        if (!Double.isFinite(longitude) || longitude < -180.0 || longitude > 180.0) {
            throw new TravelValidationException("INVALID_LONGITUDE", "lon", "Longitude must be between -180.0 and 180.0 degrees");
        }
    }
}
