package com.ahmed.travelservice.provider.weather;

import com.ahmed.travelservice.dto.weather.WeatherResponseDto;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.error.TravelProviderException;

/** Provider-neutral abstraction for live weather forecasts. */
public interface WeatherProvider {
    ProviderMetadata getMetadata();

    WeatherResponseDto getWeather(double latitude, double longitude, int forecastDays)
            throws TravelProviderException;
}
