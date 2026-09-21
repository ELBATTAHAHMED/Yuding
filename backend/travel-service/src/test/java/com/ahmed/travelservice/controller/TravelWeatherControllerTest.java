package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.weather.WeatherCondition;
import com.ahmed.travelservice.dto.weather.WeatherCurrentDto;
import com.ahmed.travelservice.dto.weather.WeatherResponseDto;
import com.ahmed.travelservice.service.WeatherService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
class TravelWeatherControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WeatherService weatherService;

    @Test
    void weatherEndpointIsPublicAndReturnsNormalizedResponse() throws Exception {
        WeatherResponseDto response = WeatherResponseDto.builder()
                .provider("OPEN_METEO")
                .latitude(31.6258)
                .longitude(-7.9891)
                .timezone("Africa/Casablanca")
                .current(WeatherCurrentDto.builder().temperature(27.0).condition(WeatherCondition.CLEAR).conditionLabel("Clear sky").build())
                .hourlyForecast(List.of())
                .dailyForecast(List.of())
                .build();
        when(weatherService.getWeather(any(), any(), any())).thenReturn(response);

        mockMvc.perform(get("/travel/weather").param("lat", "31.6258").param("lon", "-7.9891").param("forecastDays", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provider", is("OPEN_METEO")))
                .andExpect(jsonPath("$.current.condition", is("CLEAR")))
                .andExpect(header().string("Cache-Control", containsString("max-age=600")));
    }

    @Test
    void weatherEndpointRequiresCoordinates() throws Exception {
        mockMvc.perform(get("/travel/weather").param("lat", "31.6258"))
                .andExpect(status().isBadRequest());
    }
}
