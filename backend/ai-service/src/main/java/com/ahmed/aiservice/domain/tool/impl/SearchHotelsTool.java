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
 * Read-only tool for hotel search via travel-service.
 */
@Component
public class SearchHotelsTool implements AiTool {

    private static final Logger log = LoggerFactory.getLogger(SearchHotelsTool.class);
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    private final InternalTravelClient travelClient;
    private final int maxResults;
    private final AiToolDefinition definition;

    public SearchHotelsTool(InternalTravelClient travelClient,
                            @Value("${yuding.ai.max-tool-results:5}") int maxResults) {
        this.travelClient = travelClient;
        this.maxResults = maxResults;
        this.definition = new AiToolDefinition(
                "searchHotels",
                "Recherche les hôtels disponibles selon la destination (ville) et les dates de séjour. Renvoie les offres vérifiées avec prix et disponibilités.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "destination", Map.of("type", "string", "description", "Ville ou destination recherchée (ex: Paris, Marrakech, Rome)"),
                                "checkIn", Map.of("type", "string", "description", "Date d'arrivée au format YYYY-MM-DD"),
                                "checkOut", Map.of("type", "string", "description", "Date de départ au format YYYY-MM-DD"),
                                "rooms", Map.of("type", "integer", "description", "Nombre de chambres (défaut: 1)"),
                                "adults", Map.of("type", "integer", "description", "Nombre d'adultes (défaut: 1)"),
                                "currency", Map.of("type", "string", "description", "Devise souhaitée (ex: EUR, MAD, USD)")
                        ),
                        "required", List.of("destination", "checkIn", "checkOut")
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

        String destination = getString(args, "destination");
        String checkIn = getString(args, "checkIn");
        String checkOut = getString(args, "checkOut");

        if (destination == null || destination.trim().length() < 2) {
            return AiToolResult.error(callId, "searchHotels", "Destination invalide ou trop courte (minimum 2 caractères).");
        }
        if (checkIn == null || !DATE_PATTERN.matcher(checkIn.trim()).matches()) {
            return AiToolResult.error(callId, "searchHotels", "Format de date d'arrivée (checkIn) invalide: '" + checkIn + "'. Format attendu: YYYY-MM-DD.");
        }
        if (checkOut == null || !DATE_PATTERN.matcher(checkOut.trim()).matches()) {
            return AiToolResult.error(callId, "searchHotels", "Format de date de départ (checkOut) invalide: '" + checkOut + "'. Format attendu: YYYY-MM-DD.");
        }

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("destination", destination.trim());
        request.put("checkIn", checkIn.trim());
        request.put("checkOut", checkOut.trim());

        int rooms = 1;
        if (args.get("rooms") instanceof Number num) {
            rooms = Math.max(1, Math.min(8, num.intValue()));
        }
        request.put("rooms", rooms);

        int adults = 1;
        if (args.get("adults") instanceof Number num) {
            adults = Math.max(1, Math.min(20, num.intValue()));
        }
        request.put("adults", adults);

        String currency = getString(args, "currency");
        if (currency != null && currency.trim().length() == 3) {
            request.put("currency", currency.trim().toUpperCase());
        } else {
            request.put("currency", "EUR");
        }

        try {
            JsonNode response = travelClient.searchHotels(request);
            List<Map<String, Object>> items = new ArrayList<>();
            if (response != null && response.has("items") && response.get("items").isArray()) {
                JsonNode itemsNode = response.get("items");
                int count = 0;
                for (JsonNode item : itemsNode) {
                    if (count >= maxResults) break;
                    Map<String, Object> hotel = new LinkedHashMap<>();
                    hotel.put("id", item.path("id").asText(""));
                    hotel.put("hotelName", item.path("hotelName").asText(""));
                    hotel.put("city", item.path("city").asText(destination));
                    hotel.put("address", item.path("address").asText(""));
                    hotel.put("starRating", item.path("starRating").asInt(0));
                    hotel.put("roomType", item.path("roomType").asText(""));
                    hotel.put("pricePerNight", item.hasNonNull("pricePerNight") ? item.path("pricePerNight").asDouble() : null);
                    hotel.put("totalPrice", item.hasNonNull("totalPrice") ? item.path("totalPrice").asDouble() : null);
                    hotel.put("currency", item.path("currency").asText("EUR"));
                    items.add(hotel);
                    count++;
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("destination", destination.trim());
            result.put("checkIn", checkIn.trim());
            result.put("checkOut", checkOut.trim());
            result.put("totalFound", items.size());
            result.put("hotels", items);

            return AiToolResult.success(callId, "searchHotels", result);
        } catch (Exception e) {
            log.error("Hotel search tool failed: {}", e.getMessage());
            return AiToolResult.error(callId, "searchHotels", "Erreur lors de la recherche d'hôtels: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        Object val = args.get(key);
        return val != null ? val.toString() : null;
    }
}
