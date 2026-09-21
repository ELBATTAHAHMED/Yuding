package com.ahmed.travelservice.service;

import com.ahmed.travelservice.config.OpenMeteoProperties;
import com.ahmed.travelservice.dto.weather.WeatherResponseDto;
import com.ahmed.travelservice.exception.TravelValidationException;
import com.ahmed.travelservice.provider.weather.WeatherProvider;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WeatherServiceTest {
    @Test
    void rejectsCoordinatesAndForecastLengthBeforeCallingProvider() {
        WeatherProvider provider = mock(WeatherProvider.class);
        WeatherService service = new WeatherService(provider, new OpenMeteoProperties());

        assertThatThrownBy(() -> service.getWeather(91.0, 0.0, 7)).isInstanceOf(TravelValidationException.class);
        assertThatThrownBy(() -> service.getWeather(0.0, 0.0, 17)).isInstanceOf(TravelValidationException.class);
    }

    @Test
    void usesConfiguredDefaultForecastLengthWhenOptionalParameterIsOmitted() {
        WeatherProvider provider = mock(WeatherProvider.class);
        OpenMeteoProperties properties = new OpenMeteoProperties();
        properties.setForecastDays(5);
        when(provider.getWeather(anyDouble(), anyDouble(), anyInt())).thenReturn(WeatherResponseDto.builder().build());
        WeatherService service = new WeatherService(provider, properties);

        service.getWeather(31.6258, -7.9891, null);

        verify(provider).getWeather(31.6258, -7.9891, 5);
    }
}
