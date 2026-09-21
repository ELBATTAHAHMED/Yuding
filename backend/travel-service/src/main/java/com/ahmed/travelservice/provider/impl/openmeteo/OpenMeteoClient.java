package com.ahmed.travelservice.provider.impl.openmeteo;

import com.ahmed.travelservice.config.OpenMeteoProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.openmeteo.model.OpenMeteoModels.Forecast;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/** Dedicated server-side client for Open-Meteo. No client is ever exposed to this URL. */
@Component
public class OpenMeteoClient {
    public static final String PROVIDER_CODE = "OPEN_METEO";
    private static final Logger log = LoggerFactory.getLogger(OpenMeteoClient.class);
    private static final String CURRENT_VARIABLES = "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,precipitation,rain,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
    private static final String HOURLY_VARIABLES = "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,rain,weather_code,wind_speed_10m";
    private static final String DAILY_VARIABLES = "weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,precipitation_sum,rain_sum,wind_speed_10m_max,wind_gusts_10m_max,sunrise,sunset";

    private final OpenMeteoProperties properties;
    private final RestClient restClient;

    @Autowired
    public OpenMeteoClient(OpenMeteoProperties properties) {
        this(properties, createDefaultRestClient(properties));
    }

    public OpenMeteoClient(OpenMeteoProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    private static RestClient createDefaultRestClient(OpenMeteoProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "Yuding/2.0 (Weather; travel-service)")
                .build();
    }

    public Forecast getForecast(double latitude, double longitude, int forecastDays) {
        if (!properties.isConfigured()) {
            throw TravelProviderException.notConfigured(PROVIDER_CODE, "Open-Meteo base URL is not configured");
        }
        int boundedDays = Math.max(1, Math.min(forecastDays, 16));
        String timezone = properties.getTimezone() == null || properties.getTimezone().isBlank() ? "auto" : properties.getTimezone();

        try {
            Forecast forecast = restClient.get()
                    .uri(builder -> builder.path("/v1/forecast")
                            .queryParam("latitude", latitude)
                            .queryParam("longitude", longitude)
                            .queryParam("current", CURRENT_VARIABLES)
                            .queryParam("hourly", HOURLY_VARIABLES)
                            .queryParam("daily", DAILY_VARIABLES)
                            .queryParam("forecast_days", boundedDays)
                            .queryParam("timezone", timezone)
                            .build())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> handleHttpError(response.getStatusCode()))
                    .body(Forecast.class);

            if (forecast == null) {
                throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                        "Open-Meteo returned an empty weather response");
            }
            return forecast;
        } catch (ResourceAccessException ex) {
            log.warn("Open-Meteo weather request timed out");
            throw TravelProviderException.timeout(PROVIDER_CODE, "Open-Meteo weather request timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("Open-Meteo weather request failed: {}", ex.getClass().getSimpleName());
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Open-Meteo weather request failed");
        }
    }

    private void handleHttpError(HttpStatusCode status) {
        if (status.value() == 429) {
            throw TravelProviderException.rateLimitExceeded(PROVIDER_CODE, "Open-Meteo rate limit reached");
        }
        if (status.is4xxClientError()) {
            throw TravelProviderException.invalidSearch(PROVIDER_CODE, "Open-Meteo rejected the weather request");
        }
        throw TravelProviderException.unavailable(PROVIDER_CODE, "Open-Meteo is temporarily unavailable");
    }
}
