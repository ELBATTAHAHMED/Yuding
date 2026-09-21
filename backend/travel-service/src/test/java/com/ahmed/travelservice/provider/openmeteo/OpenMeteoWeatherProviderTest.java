package com.ahmed.travelservice.provider.openmeteo;

import com.ahmed.travelservice.dto.weather.WeatherCondition;
import com.ahmed.travelservice.dto.weather.WeatherResponseDto;
import com.ahmed.travelservice.provider.impl.openmeteo.OpenMeteoClient;
import com.ahmed.travelservice.provider.impl.openmeteo.OpenMeteoWeatherProvider;
import com.ahmed.travelservice.provider.impl.openmeteo.model.OpenMeteoModels.*;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OpenMeteoWeatherProviderTest {
    @Test
    void mapsRawProviderPayloadToProviderNeutralWeatherResponse() {
        Forecast forecast = new Forecast();
        forecast.setLatitude(31.6258);
        forecast.setLongitude(-7.9891);
        forecast.setTimezone("Africa/Casablanca");

        Units units = new Units();
        units.setTemperature2m("°C");
        units.setWindSpeed10m("km/h");
        units.setPrecipitation("mm");
        forecast.setCurrentUnits(units);

        Current current = new Current();
        current.setTime("2026-09-21T12:00");
        current.setTemperature2m(27.0);
        current.setApparentTemperature(27.5);
        current.setWeatherCode(80);
        current.setIsDay(1);
        current.setWindDirection10m(225.0);
        forecast.setCurrent(current);

        Hourly hourly = new Hourly();
        hourly.setTime(List.of("2026-09-21T12:00"));
        hourly.setWeatherCode(List.of(3));
        hourly.setTemperature2m(List.of(27.0));
        forecast.setHourly(hourly);

        Daily daily = new Daily();
        daily.setTime(List.of("2026-09-21"));
        daily.setWeatherCode(List.of(95));
        daily.setTemperature2mMin(List.of(18.0));
        daily.setTemperature2mMax(List.of(29.0));
        forecast.setDaily(daily);

        OpenMeteoClient client = mock(OpenMeteoClient.class);
        when(client.getForecast(anyDouble(), anyDouble(), anyInt())).thenReturn(forecast);
        OpenMeteoWeatherProvider provider = new OpenMeteoWeatherProvider(client);

        WeatherResponseDto result = provider.getWeather(31.6258, -7.9891, 7);

        assertThat(result.getProvider()).isEqualTo("OPEN_METEO");
        assertThat(result.getCurrent().getCondition()).isEqualTo(WeatherCondition.SHOWERS);
        assertThat(result.getCurrent().getWindDirectionLabel()).isEqualTo("SW");
        assertThat(result.getHourlyForecast().getFirst().getCondition()).isEqualTo(WeatherCondition.CLOUDY);
        assertThat(result.getDailyForecast().getFirst().getCondition()).isEqualTo(WeatherCondition.THUNDERSTORM);
    }
}
