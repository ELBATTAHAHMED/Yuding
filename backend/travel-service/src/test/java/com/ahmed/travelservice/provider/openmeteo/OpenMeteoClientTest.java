package com.ahmed.travelservice.provider.openmeteo;

import com.ahmed.travelservice.config.OpenMeteoProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.openmeteo.OpenMeteoClient;
import com.ahmed.travelservice.provider.impl.openmeteo.model.OpenMeteoModels.Forecast;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenMeteoClientTest {
    private OpenMeteoClient client;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        OpenMeteoProperties properties = new OpenMeteoProperties();
        properties.setBaseUrl("https://api.open-meteo.com");
        properties.setTimezone("auto");
        RestClient.Builder builder = RestClient.builder().baseUrl(properties.getBaseUrl());
        mockServer = MockRestServiceServer.bindTo(builder).build();
        client = new OpenMeteoClient(properties, builder.build());
    }

    @Test
    void sendsOneForecastRequestWithCurrentHourlyDailyAndLocalTimezone() {
        String json = """
                {
                  "latitude": 31.6258,
                  "longitude": -7.9891,
                  "timezone": "Africa/Casablanca",
                  "current_units": {"temperature_2m":"°C","wind_speed_10m":"km/h","precipitation":"mm"},
                  "current": {"time":"2026-09-21T12:00","temperature_2m":27.2,"weather_code":1,"is_day":1},
                  "hourly": {"time":["2026-09-21T12:00"],"temperature_2m":[27.2]},
                  "daily": {"time":["2026-09-21"],"weather_code":[1]}
                }
                """;

        mockServer.expect(request -> {
                    String query = request.getURI().getQuery();
                    assertThat(request.getURI().getPath()).isEqualTo("/v1/forecast");
                    assertThat(query).contains("latitude=31.6258", "longitude=-7.9891", "forecast_days=7", "timezone=auto");
                    assertThat(query).contains("current=", "hourly=", "daily=");
                })
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        Forecast result = client.getForecast(31.6258, -7.9891, 7);

        assertThat(result.getTimezone()).isEqualTo("Africa/Casablanca");
        assertThat(result.getCurrent().getTemperature2m()).isEqualTo(27.2);
        mockServer.verify();
    }

    @Test
    void convertsRateLimitToProviderErrorWithoutLiveNetworkCall() {
        mockServer.expect(request -> assertThat(request.getURI().getPath()).isEqualTo("/v1/forecast"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.getForecast(31.6258, -7.9891, 7))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_RATE_LIMITED);
    }
}
