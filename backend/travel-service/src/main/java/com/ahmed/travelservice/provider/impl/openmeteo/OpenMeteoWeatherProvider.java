package com.ahmed.travelservice.provider.impl.openmeteo;

import com.ahmed.travelservice.dto.weather.*;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.openmeteo.model.OpenMeteoModels.*;
import com.ahmed.travelservice.provider.weather.WeatherProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Open-Meteo implementation of the provider-neutral weather abstraction. */
@Component
@RequiredArgsConstructor
public class OpenMeteoWeatherProvider implements WeatherProvider {
    private static final ProviderMetadata METADATA = ProviderMetadata.builder()
            .providerCode(OpenMeteoClient.PROVIDER_CODE)
            .displayName("Open-Meteo Weather Forecast")
            .supportedCapabilities(Collections.emptySet())
            .build();

    private final OpenMeteoClient client;

    @Override
    public ProviderMetadata getMetadata() {
        return METADATA;
    }

    @Override
    public WeatherResponseDto getWeather(double latitude, double longitude, int forecastDays) {
        Forecast forecast = client.getForecast(latitude, longitude, forecastDays);
        if (forecast.getCurrent() == null && forecast.getDaily() == null && forecast.getHourly() == null) {
            throw new TravelProviderException(OpenMeteoClient.PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Open-Meteo did not return weather observations or forecasts");
        }

        Units units = forecast.getCurrentUnits();
        return WeatherResponseDto.builder()
                .provider(OpenMeteoClient.PROVIDER_CODE)
                .latitude(forecast.getLatitude() != null ? forecast.getLatitude() : latitude)
                .longitude(forecast.getLongitude() != null ? forecast.getLongitude() : longitude)
                .timezone(forecast.getTimezone())
                .temperatureUnit(units != null && units.getTemperature2m() != null ? units.getTemperature2m() : "°C")
                .windSpeedUnit(units != null && units.getWindSpeed10m() != null ? units.getWindSpeed10m() : "km/h")
                .precipitationUnit(units != null && units.getPrecipitation() != null ? units.getPrecipitation() : "mm")
                .current(mapCurrent(forecast.getCurrent()))
                .hourlyForecast(mapHourly(forecast.getHourly()))
                .dailyForecast(mapDaily(forecast.getDaily()))
                .build();
    }

    private WeatherCurrentDto mapCurrent(Current source) {
        if (source == null) return null;
        WmoWeatherCodeMapper.ConditionInfo condition = WmoWeatherCodeMapper.map(source.getWeatherCode());
        return WeatherCurrentDto.builder()
                .time(source.getTime()).temperature(source.getTemperature2m()).apparentTemperature(source.getApparentTemperature())
                .relativeHumidity(source.getRelativeHumidity2m()).weatherCode(source.getWeatherCode())
                .condition(condition.condition()).conditionLabel(condition.label()).day(source.getIsDay() == null ? null : source.getIsDay() == 1)
                .precipitation(source.getPrecipitation()).rain(source.getRain()).windSpeed(source.getWindSpeed10m())
                .windDirection(source.getWindDirection10m()).windDirectionLabel(WmoWeatherCodeMapper.compassDirection(source.getWindDirection10m()))
                .windGusts(source.getWindGusts10m()).build();
    }

    private List<WeatherHourlyForecastDto> mapHourly(Hourly source) {
        if (source == null || source.getTime() == null) return Collections.emptyList();
        List<WeatherHourlyForecastDto> results = new ArrayList<>();
        for (int i = 0; i < source.getTime().size(); i++) {
            Integer code = valueAt(source.getWeatherCode(), i);
            WmoWeatherCodeMapper.ConditionInfo condition = WmoWeatherCodeMapper.map(code);
            results.add(WeatherHourlyForecastDto.builder()
                    .time(source.getTime().get(i)).temperature(valueAt(source.getTemperature2m(), i))
                    .apparentTemperature(valueAt(source.getApparentTemperature(), i)).relativeHumidity(valueAt(source.getRelativeHumidity2m(), i))
                    .precipitationProbability(valueAt(source.getPrecipitationProbability(), i)).precipitation(valueAt(source.getPrecipitation(), i))
                    .rain(valueAt(source.getRain(), i)).weatherCode(code).condition(condition.condition()).conditionLabel(condition.label())
                    .windSpeed(valueAt(source.getWindSpeed10m(), i)).build());
        }
        return results;
    }

    private List<WeatherDailyForecastDto> mapDaily(Daily source) {
        if (source == null || source.getTime() == null) return Collections.emptyList();
        List<WeatherDailyForecastDto> results = new ArrayList<>();
        for (int i = 0; i < source.getTime().size(); i++) {
            Integer code = valueAt(source.getWeatherCode(), i);
            WmoWeatherCodeMapper.ConditionInfo condition = WmoWeatherCodeMapper.map(code);
            results.add(WeatherDailyForecastDto.builder()
                    .date(source.getTime().get(i)).weatherCode(code).condition(condition.condition()).conditionLabel(condition.label())
                    .temperatureMin(valueAt(source.getTemperature2mMin(), i)).temperatureMax(valueAt(source.getTemperature2mMax(), i))
                    .precipitationProbabilityMax(valueAt(source.getPrecipitationProbabilityMax(), i))
                    .precipitationSum(valueAt(source.getPrecipitationSum(), i)).rainSum(valueAt(source.getRainSum(), i))
                    .windSpeedMax(valueAt(source.getWindSpeed10mMax(), i)).windGustsMax(valueAt(source.getWindGusts10mMax(), i))
                    .sunrise(valueAt(source.getSunrise(), i)).sunset(valueAt(source.getSunset(), i)).build());
        }
        return results;
    }

    private static <T> T valueAt(List<T> values, int index) {
        return values != null && index >= 0 && index < values.size() ? values.get(index) : null;
    }
}
