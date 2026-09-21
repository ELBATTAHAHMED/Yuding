package com.ahmed.travelservice.service;

import com.ahmed.travelservice.config.OpenMeteoProperties;
import com.ahmed.travelservice.dto.weather.WeatherResponseDto;
import com.ahmed.travelservice.exception.TravelValidationException;
import com.ahmed.travelservice.provider.weather.WeatherProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Validates weather requests before delegating to the configured weather provider. */
@Service
@RequiredArgsConstructor
public class WeatherService {
    private static final int MIN_FORECAST_DAYS = 1;
    private static final int MAX_FORECAST_DAYS = 16;

    private final WeatherProvider weatherProvider;
    private final OpenMeteoProperties properties;

    public WeatherResponseDto getWeather(Double latitude, Double longitude, Integer forecastDays) {
        validateCoordinates(latitude, longitude);
        int days = forecastDays == null ? properties.getForecastDays() : forecastDays;
        if (days < MIN_FORECAST_DAYS || days > MAX_FORECAST_DAYS) {
            throw new TravelValidationException("INVALID_FORECAST_DAYS", "forecastDays",
                    "forecastDays must be between 1 and 16 days");
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
