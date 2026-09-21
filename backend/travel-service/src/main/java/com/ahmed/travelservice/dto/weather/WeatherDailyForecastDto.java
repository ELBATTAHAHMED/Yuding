package com.ahmed.travelservice.dto.weather;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherDailyForecastDto {
    private String date;
    private Integer weatherCode;
    private WeatherCondition condition;
    private String conditionLabel;
    private Double temperatureMin;
    private Double temperatureMax;
    private Integer precipitationProbabilityMax;
    private Double precipitationSum;
    private Double rainSum;
    private Double windSpeedMax;
    private Double windGustsMax;
    private String sunrise;
    private String sunset;
}
