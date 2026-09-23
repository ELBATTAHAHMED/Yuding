package com.ahmed.aiservice.domain.tool.impl;

import com.ahmed.aiservice.client.InternalTravelClient;
import com.ahmed.aiservice.domain.tool.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Read-only tool for flight search via travel-service.
 */
@Component
public class SearchFlightsTool implements AiTool {

    private static final Logger log = LoggerFactory.getLogger(SearchFlightsTool.class);
    private static final Pattern IATA_PATTERN = Pattern.compile("^[A-Za-z]{3}$");
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    private final InternalTravelClient travelClient;
    private final int maxResults;
    private final AiToolDefinition definition;

    public SearchFlightsTool(InternalTravelClient travelClient,
                             @Value("${yuding.ai.max-tool-results:5}") int maxResults) {
        this.travelClient = travelClient;
        this.maxResults = maxResults;
        this.definition = new AiToolDefinition(
                "searchFlights",
                "Recherche les vols disponibles selon l'origine, la destination et les dates. Renvoie les offres vérifiées avec prix réels et horaires.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "origin", Map.of("type", "string", "description", "Code IATA de départ (ex: CDG, PAR, JFK)"),
                                "destination", Map.of("type", "string", "description", "Code IATA d'arrivée (ex: NCE, LHR, DXB)"),
                                "departureDate", Map.of("type", "string", "description", "Date de départ au format YYYY-MM-DD"),
                                "returnDate", Map.of("type", "string", "description", "Date de retour optionnelle au format YYYY-MM-DD"),
                                "adults", Map.of("type", "integer", "description", "Nombre de passagers adultes (défaut: 1)"),
                                "cabinClass", Map.of("type", "string", "description", "Classe de voyage: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST")
                        ),
                        "required", List.of("origin", "destination", "departureDate")
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

        String origin = getString(args, "origin");
        String destination = getString(args, "destination");
        String departureDate = getString(args, "departureDate");

        if (origin == null || !IATA_PATTERN.matcher(origin.trim()).matches()) {
            return AiToolResult.error(callId, "searchFlights", "Code IATA d'origine invalide: '" + origin + "'. Doit comporter 3 lettres.");
        }
        if (destination == null || !IATA_PATTERN.matcher(destination.trim()).matches()) {
            return AiToolResult.error(callId, "searchFlights", "Code IATA de destination invalide: '" + destination + "'. Doit comporter 3 lettres.");
        }
        if (departureDate == null || !DATE_PATTERN.matcher(departureDate.trim()).matches()) {
            return AiToolResult.error(callId, "searchFlights", "Format de date de départ invalide: '" + departureDate + "'. Format attendu: YYYY-MM-DD.");
        }

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("origin", origin.trim().toUpperCase());
        request.put("destination", destination.trim().toUpperCase());
        request.put("departureDate", departureDate.trim());

        String returnDate = getString(args, "returnDate");
        if (returnDate != null && DATE_PATTERN.matcher(returnDate.trim()).matches()) {
            request.put("returnDate", returnDate.trim());
        }

        Object adultsObj = args.get("adults");
        int adults = 1;
        if (adultsObj instanceof Number num) {
            adults = Math.max(1, Math.min(9, num.intValue()));
        }
        request.put("adults", adults);

        String cabinClass = getString(args, "cabinClass");
        if (cabinClass != null && !cabinClass.isBlank()) {
            request.put("cabinClass", cabinClass.trim().toUpperCase());
        } else {
            request.put("cabinClass", "ECONOMY");
        }

        try {
            JsonNode response = travelClient.searchFlights(request);
            List<Map<String, Object>> items = new ArrayList<>();
            if (response != null && response.has("items") && response.get("items").isArray()) {
                JsonNode itemsNode = response.get("items");
                int count = 0;
                for (JsonNode item : itemsNode) {
                    if (count >= maxResults) break;
                    Map<String, Object> offer = new LinkedHashMap<>();
                    offer.put("id", item.path("id").asText(""));
                    offer.put("airline", item.path("airline").asText(""));
                    offer.put("flightNumber", item.path("flightNumber").asText(""));
                    offer.put("origin", item.path("originAirport").asText(origin));
                    offer.put("destination", item.path("destinationAirport").asText(destination));
                    offer.put("departureTime", item.path("departureTime").asText(""));
                    offer.put("arrivalTime", item.path("arrivalTime").asText(""));
                    offer.put("durationMinutes", item.path("durationMinutes").asInt(0));
                    offer.put("stops", item.path("stops").asInt(0));
                    offer.put("price", item.path("price").asDouble(0.0));
                    offer.put("currency", item.path("currency").asText("EUR"));
                    items.add(offer);
                    count++;
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("totalFound", items.size());
            result.put("origin", origin.toUpperCase());
            result.put("destination", destination.toUpperCase());
            result.put("departureDate", departureDate);
            result.put("flights", items);

            return AiToolResult.success(callId, "searchFlights", result);
        } catch (Exception e) {
            log.error("Flight search tool failed: {}", e.getMessage());
            return AiToolResult.error(callId, "searchFlights", "Erreur lors de la recherche de vols: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        Object val = args.get(key);
        return val != null ? val.toString() : null;
    }
}
