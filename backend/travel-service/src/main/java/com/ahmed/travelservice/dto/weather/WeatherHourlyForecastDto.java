package com.ahmed.travelservice.dto.weather;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherHourlyForecastDto {
    private String time;
    private Double temperature;
    private Double apparentTemperature;
    private Integer relativeHumidity;
    private Integer precipitationProbability;
    private Double precipitation;
    private Double rain;
    private Integer weatherCode;
    private WeatherCondition condition;
    private String conditionLabel;
    private Double windSpeed;
}
