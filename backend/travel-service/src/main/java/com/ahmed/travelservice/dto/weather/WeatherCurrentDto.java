package com.ahmed.travelservice.dto.weather;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherCurrentDto {
    private String time;
    private Double temperature;
    private Double apparentTemperature;
    private Integer relativeHumidity;
    private Integer weatherCode;
    private WeatherCondition condition;
    private String conditionLabel;
    private Boolean day;
    private Double precipitation;
    private Double rain;
    private Double windSpeed;
    private Double windDirection;
    private String windDirectionLabel;
    private Double windGusts;
}
