package com.ahmed.travelservice.dto.weather;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherResponseDto {
    private String provider;
    private Double latitude;
    private Double longitude;
    private String timezone;
    private String temperatureUnit;
    private String windSpeedUnit;
    private String precipitationUnit;
    private WeatherCurrentDto current;
    private List<WeatherHourlyForecastDto> hourlyForecast;
    private List<WeatherDailyForecastDto> dailyForecast;
}
