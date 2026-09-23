package com.ahmed.aiservice.domain.tool.impl;

import com.ahmed.aiservice.client.InternalTravelClient;
import com.ahmed.aiservice.domain.tool.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Read-only tool for fetching live destination weather and forecast via travel-service.
 * Automatically geocodes location names if coordinates are not provided.
 */
@Component
public class GetWeatherTool implements AiTool {

    private static final Logger log = LoggerFactory.getLogger(GetWeatherTool.class);

    private final InternalTravelClient travelClient;
    private final AiToolDefinition definition;

    public GetWeatherTool(InternalTravelClient travelClient) {
        this.travelClient = travelClient;
        this.definition = new AiToolDefinition(
                "getWeather",
                "Consulte la météo actuelle et les prévisions pour une destination ou ville donnée (avec résolution automatique des coordonnées).",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "location", Map.of("type", "string", "description", "Nom de la ville ou destination (ex: Paris, Marrakech, Tokyo)"),
                                "latitude", Map.of("type", "number", "description", "Latitude optionnelle si déjà connue"),
                                "longitude", Map.of("type", "number", "description", "Longitude optionnelle si déjà connue"),
                                "forecastDays", Map.of("type", "integer", "description", "Nombre de jours de prévisions souhaités (1 à 7, défaut: 3)")
                        ),
                        "required", List.of("location")
                )
        );
    }

    @Override
    public AiToolDefinition getDefinition() {
        return definition;
    }

    @Override
    public AiToolResult execute(AiToolCall call, AiToolExecutionContext context) {
        String callId = call.getId();
        Map<String, Object> args = call.getArguments();

        String location = getString(args, "location");
        Double lat = getDouble(args, "latitude");
        Double lon = getDouble(args, "longitude");

        int forecastDays = 3;
        if (args.get("forecastDays") instanceof Number num) {
            forecastDays = Math.max(1, Math.min(7, num.intValue()));
        }

        String resolvedPlaceName = location;

        // Geocode if coordinates not explicitly provided
        if (lat == null || lon == null) {
            if (location == null || location.trim().isBlank()) {
                return AiToolResult.error(callId, "getWeather", "Une localisation (nom de ville) ou des coordonnées géographiques sont requises.");
            }
            try {
                JsonNode geoNode = travelClient.geocode(location.trim());
                if (geoNode != null && geoNode.isArray() && !geoNode.isEmpty()) {
                    JsonNode place = geoNode.get(0);
                    lat = place.path("latitude").asDouble();
                    lon = place.path("longitude").asDouble();
                    resolvedPlaceName = place.path("formatted").asText(place.path("name").asText(location));
                } else {
                    return AiToolResult.error(callId, "getWeather", "Impossible de localiser la ville: '" + location + "'.");
                }
            } catch (Exception e) {
                log.warn("Geocoding failed for '{}': {}", location, e.getMessage());
                return AiToolResult.error(callId, "getWeather", "Erreur de géocodage pour la localisation: " + e.getMessage());
            }
        }

        try {
            JsonNode weatherNode = travelClient.getWeather(lat, lon, forecastDays);
            if (weatherNode == null) {
                return AiToolResult.error(callId, "getWeather", "Données météo indisponibles pour " + resolvedPlaceName);
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("location", resolvedPlaceName);
            result.put("latitude", lat);
            result.put("longitude", lon);
            result.put("temperatureUnit", weatherNode.path("temperatureUnit").asText("°C"));

            JsonNode current = weatherNode.path("current");
            if (!current.isMissingNode()) {
                Map<String, Object> currentMap = new LinkedHashMap<>();
                currentMap.put("temperature", current.path("temperature").asDouble());
                currentMap.put("apparentTemperature", current.path("apparentTemperature").asDouble());
                currentMap.put("condition", current.path("conditionLabel").asText(current.path("condition").asText("")));
                currentMap.put("humidity", current.path("relativeHumidity").asInt() + "%");
                currentMap.put("windSpeed", current.path("windSpeed").asDouble() + " " + weatherNode.path("windSpeedUnit").asText("km/h"));
                result.put("current", currentMap);
            }

            JsonNode daily = weatherNode.path("dailyForecast");
            if (daily.isArray()) {
                List<Map<String, Object>> forecastList = new ArrayList<>();
                for (JsonNode day : daily) {
                    Map<String, Object> dayMap = new LinkedHashMap<>();
                    dayMap.put("date", day.path("date").asText(""));
                    dayMap.put("minTemp", day.path("minTemperature").asDouble());
                    dayMap.put("maxTemp", day.path("maxTemperature").asDouble());
                    dayMap.put("condition", day.path("conditionLabel").asText(day.path("condition").asText("")));
                    forecastList.add(dayMap);
                }
                result.put("forecast", forecastList);
            }

            return AiToolResult.success(callId, "getWeather", result);
        } catch (Exception e) {
            log.error("Weather tool failed: {}", e.getMessage());
            return AiToolResult.error(callId, "getWeather", "Erreur lors de la récupération de la météo: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        Object val = args.get(key);
        return val != null ? val.toString() : null;
    }

    private Double getDouble(Map<String, Object> args, String key) {
        Object val = args.get(key);
        if (val instanceof Number num) return num.doubleValue();
        if (val instanceof String s && !s.isBlank()) {
            try { return Double.parseDouble(s.trim()); } catch (NumberFormatException ignored) {}
        }
        return null;
    }
}
