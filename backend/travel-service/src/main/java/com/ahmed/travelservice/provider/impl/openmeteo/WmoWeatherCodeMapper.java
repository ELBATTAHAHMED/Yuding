package com.ahmed.travelservice.provider.impl.openmeteo;

import com.ahmed.travelservice.dto.weather.WeatherCondition;

/** Maps WMO weather interpretation codes to a stable public vocabulary. */
public final class WmoWeatherCodeMapper {
    private WmoWeatherCodeMapper() { }

    public record ConditionInfo(WeatherCondition condition, String label) { }

    public static ConditionInfo map(Integer code) {
        if (code == null) return new ConditionInfo(WeatherCondition.UNKNOWN, "Unknown conditions");

        return switch (code) {
            case 0 -> new ConditionInfo(WeatherCondition.CLEAR, "Clear sky");
            case 1, 2 -> new ConditionInfo(WeatherCondition.PARTLY_CLOUDY, "Partly cloudy");
            case 3 -> new ConditionInfo(WeatherCondition.CLOUDY, "Overcast");
            case 45, 48 -> new ConditionInfo(WeatherCondition.FOG, "Fog");
            case 51, 53, 55, 56, 57 -> new ConditionInfo(WeatherCondition.DRIZZLE, "Drizzle");
            case 61, 63, 65, 66, 67 -> new ConditionInfo(WeatherCondition.RAIN, "Rain");
            case 71, 73, 75, 77, 85, 86 -> new ConditionInfo(WeatherCondition.SNOW, "Snow");
            case 80, 81, 82 -> new ConditionInfo(WeatherCondition.SHOWERS, "Rain showers");
            case 95, 96, 99 -> new ConditionInfo(WeatherCondition.THUNDERSTORM, "Thunderstorm");
            default -> new ConditionInfo(WeatherCondition.UNKNOWN, "Unknown conditions");
        };
    }

    public static String compassDirection(Double degrees) {
        if (degrees == null) return null;
        String[] directions = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};
        int index = (int) Math.floor(((degrees % 360 + 360) % 360 + 22.5) / 45.0) % 8;
        return directions[index];
    }
}
