package com.ahmed.aiservice.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Internal REST client communicating with travel-service (default port 8082).
 */
@Component
public class InternalTravelClient {

    private static final Logger log = LoggerFactory.getLogger(InternalTravelClient.class);

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public InternalTravelClient(@Value("${yuding.services.travel-url:http://localhost:8082}") String travelServiceUrl,
                                ObjectMapper objectMapper) {
        this.restClient = RestClient.builder()
                .baseUrl(travelServiceUrl)
                .build();
        this.objectMapper = objectMapper;
    }

    public JsonNode searchFlights(Map<String, Object> requestBody) {
        log.debug("Calling travel-service /travel/flights/search with: {}", requestBody);
        return restClient.post()
                .uri("/travel/flights/search")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode searchHotels(Map<String, Object> requestBody) {
        log.debug("Calling travel-service /travel/hotels/search with: {}", requestBody);
        return restClient.post()
                .uri("/travel/hotels/search")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode searchActivities(Map<String, Object> requestBody) {
        log.debug("Calling travel-service /travel/activities/search with: {}", requestBody);
        return restClient.post()
                .uri("/travel/activities/search")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode searchTransfers(Map<String, Object> requestBody) {
        log.debug("Calling travel-service /travel/transfers/search with: {}", requestBody);
        return restClient.post()
                .uri("/travel/transfers/search")
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode getWeather(Double lat, Double lon, Integer forecastDays) {
        log.debug("Calling travel-service /travel/weather with lat={}, lon={}", lat, lon);
        return restClient.get()
                .uri(uriBuilder -> {
                    uriBuilder.path("/travel/weather")
                            .queryParam("lat", lat)
                            .queryParam("lon", lon);
                    if (forecastDays != null) {
                        uriBuilder.queryParam("forecastDays", forecastDays);
                    }
                    return uriBuilder.build();
                })
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode geocode(String text) {
        log.debug("Calling travel-service /travel/geo/geocode with text='{}'", text);
        return restClient.get()
                .uri(uriBuilder -> uriBuilder.path("/travel/geo/geocode")
                        .queryParam("text", text)
                        .queryParam("limit", 1)
                        .build())
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode convertCurrency(BigDecimal amount, String from, String to) {
        log.debug("Calling travel-service /travel/currency/rate with from={}, to={}", from, to);
        return restClient.get()
                .uri(uriBuilder -> uriBuilder.path("/travel/currency/rate")
                        .queryParam("from", from)
                        .queryParam("to", to)
                        .build())
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode getAirports() {
        log.debug("Calling travel-service /travel/airports");
        try {
            return restClient.get()
                    .uri("/travel/airports")
                    .retrieve()
                    .body(JsonNode.class);
        } catch (Exception e) {
            log.warn("Failed to retrieve airports from travel-service: {}", e.getMessage());
            return null;
        }
    }
}
