package com.ahmed.travelservice.provider.impl.openmeteo.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

/** Raw Open-Meteo response models. They do not leave the provider package. */
public final class OpenMeteoModels {
    private OpenMeteoModels() { }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Forecast {
        private Double latitude;
        private Double longitude;
        private String timezone;
        @JsonProperty("current_units")
        private Units currentUnits;
        private Current current;
        private Hourly hourly;
        private Daily daily;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Units {
        @JsonProperty("temperature_2m")
        private String temperature2m;
        @JsonProperty("wind_speed_10m")
        private String windSpeed10m;
        private String precipitation;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Current {
        private String time;
        @JsonProperty("temperature_2m")
        private Double temperature2m;
        @JsonProperty("apparent_temperature")
        private Double apparentTemperature;
        @JsonProperty("relative_humidity_2m")
        private Integer relativeHumidity2m;
        @JsonProperty("weather_code")
        private Integer weatherCode;
        @JsonProperty("is_day")
        private Integer isDay;
        private Double precipitation;
        private Double rain;
        @JsonProperty("wind_speed_10m")
        private Double windSpeed10m;
        @JsonProperty("wind_direction_10m")
        private Double windDirection10m;
        @JsonProperty("wind_gusts_10m")
        private Double windGusts10m;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Hourly {
        private List<String> time;
        @JsonProperty("temperature_2m")
        private List<Double> temperature2m;
        @JsonProperty("apparent_temperature")
        private List<Double> apparentTemperature;
        @JsonProperty("relative_humidity_2m")
        private List<Integer> relativeHumidity2m;
        @JsonProperty("precipitation_probability")
        private List<Integer> precipitationProbability;
        private List<Double> precipitation;
        private List<Double> rain;
        @JsonProperty("weather_code")
        private List<Integer> weatherCode;
        @JsonProperty("wind_speed_10m")
        private List<Double> windSpeed10m;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Daily {
        private List<String> time;
        @JsonProperty("weather_code")
        private List<Integer> weatherCode;
        @JsonProperty("temperature_2m_min")
        private List<Double> temperature2mMin;
        @JsonProperty("temperature_2m_max")
        private List<Double> temperature2mMax;
        @JsonProperty("precipitation_probability_max")
        private List<Integer> precipitationProbabilityMax;
        @JsonProperty("precipitation_sum")
        private List<Double> precipitationSum;
        @JsonProperty("rain_sum")
        private List<Double> rainSum;
        @JsonProperty("wind_speed_10m_max")
        private List<Double> windSpeed10mMax;
        @JsonProperty("wind_gusts_10m_max")
        private List<Double> windGusts10mMax;
        private List<String> sunrise;
        private List<String> sunset;
    }
}
