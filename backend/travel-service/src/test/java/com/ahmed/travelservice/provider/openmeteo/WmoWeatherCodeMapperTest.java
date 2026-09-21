package com.ahmed.travelservice.provider.openmeteo;

import com.ahmed.travelservice.dto.weather.WeatherCondition;
import com.ahmed.travelservice.provider.impl.openmeteo.WmoWeatherCodeMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WmoWeatherCodeMapperTest {

    @Test
    void mapsDocumentedWmoCodeFamiliesToStableConditions() {
        assertThat(WmoWeatherCodeMapper.map(0).condition()).isEqualTo(WeatherCondition.CLEAR);
        assertThat(WmoWeatherCodeMapper.map(2).condition()).isEqualTo(WeatherCondition.PARTLY_CLOUDY);
        assertThat(WmoWeatherCodeMapper.map(45).condition()).isEqualTo(WeatherCondition.FOG);
        assertThat(WmoWeatherCodeMapper.map(53).condition()).isEqualTo(WeatherCondition.DRIZZLE);
        assertThat(WmoWeatherCodeMapper.map(63).condition()).isEqualTo(WeatherCondition.RAIN);
        assertThat(WmoWeatherCodeMapper.map(73).condition()).isEqualTo(WeatherCondition.SNOW);
        assertThat(WmoWeatherCodeMapper.map(81).condition()).isEqualTo(WeatherCondition.SHOWERS);
        assertThat(WmoWeatherCodeMapper.map(96).condition()).isEqualTo(WeatherCondition.THUNDERSTORM);
        assertThat(WmoWeatherCodeMapper.map(999).condition()).isEqualTo(WeatherCondition.UNKNOWN);
    }

    @Test
    void mapsWindDirectionToCompassPoint() {
        assertThat(WmoWeatherCodeMapper.compassDirection(0.0)).isEqualTo("N");
        assertThat(WmoWeatherCodeMapper.compassDirection(90.0)).isEqualTo("E");
        assertThat(WmoWeatherCodeMapper.compassDirection(225.0)).isEqualTo("SW");
        assertThat(WmoWeatherCodeMapper.compassDirection(null)).isNull();
    }
}
