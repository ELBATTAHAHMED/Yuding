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
 * Read-only tool for activities and experiences search via travel-service.
 */
@Component
public class SearchActivitiesTool implements AiTool {

    private static final Logger log = LoggerFactory.getLogger(SearchActivitiesTool.class);
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    private final InternalTravelClient travelClient;
    private final int maxResults;
    private final AiToolDefinition definition;

    public SearchActivitiesTool(InternalTravelClient travelClient,
                                @Value("${yuding.ai.max-tool-results:5}") int maxResults) {
        this.travelClient = travelClient;
        this.maxResults = maxResults;
        this.definition = new AiToolDefinition(
                "searchActivities",
                "Recherche les activités, visites et expériences touristiques disponibles selon la destination. Renvoie les offres vérifiées avec prix réels.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "destination", Map.of("type", "string", "description", "Ville ou destination touristique (ex: Paris, Marrakech, Barcelone)"),
                                "date", Map.of("type", "string", "description", "Date optionnelle au format YYYY-MM-DD"),
                                "travelers", Map.of("type", "integer", "description", "Nombre de participants (défaut: 1)"),
                                "category", Map.of("type", "string", "description", "Catégorie d'activité (ex: CULTURE, ADVENTURE, GASTRONOMY, ALL)"),
                                "currency", Map.of("type", "string", "description", "Devise souhaitée (ex: EUR, MAD, USD)")
                        ),
                        "required", List.of("destination")
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
        if (destination == null || destination.trim().length() < 2) {
            return AiToolResult.error(callId, "searchActivities", "Destination invalide ou trop courte (minimum 2 caractères).");
        }

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("destination", destination.trim());

        String date = getString(args, "date");
        if (date != null && DATE_PATTERN.matcher(date.trim()).matches()) {
            request.put("date", date.trim());
        }

        int travelers = 1;
        if (args.get("travelers") instanceof Number num) {
            travelers = Math.max(1, Math.min(20, num.intValue()));
        }
        request.put("travelers", travelers);

        String category = getString(args, "category");
        request.put("category", category != null && !category.isBlank() ? category.trim() : "ALL");

        String currency = getString(args, "currency");
        if (currency != null && currency.trim().length() == 3) {
            request.put("currency", currency.trim().toUpperCase());
        } else {
            request.put("currency", "EUR");
        }

        try {
            JsonNode response = travelClient.searchActivities(request);
            if (response != null && "PROVIDER_UNAVAILABLE".equalsIgnoreCase(response.path("status").asText())) {
                String errorMsg = response.path("message").asText("Le service de recherche d'activités est temporairement indisponible.");
                return AiToolResult.error(callId, "searchActivities", errorMsg);
            }

            JsonNode itemsNode = null;
            if (response != null) {
                if (response.has("results") && response.get("results").isArray()) {
                    itemsNode = response.get("results");
                } else if (response.has("items") && response.get("items").isArray()) {
                    itemsNode = response.get("items");
                }
            }

            List<Map<String, Object>> items = new ArrayList<>();
            if (itemsNode != null) {
                int count = 0;
                for (JsonNode item : itemsNode) {
                    if (count >= maxResults) break;
                    Map<String, Object> activity = new LinkedHashMap<>();
                    activity.put("id", item.hasNonNull("offerId") ? item.path("offerId").asText() : item.path("id").asText(""));
                    activity.put("title", item.path("title").asText(""));
                    activity.put("category", item.path("category").asText(""));
                    activity.put("destination", item.hasNonNull("destination") ? item.path("destination").asText() : destination);
                    int durationMins = item.hasNonNull("durationMinutes")
                            ? item.path("durationMinutes").asInt()
                            : (int)(item.path("durationHours").asDouble(0.0) * 60);
                    activity.put("durationMinutes", durationMins);
                    activity.put("rating", item.path("rating").asDouble(0.0));
                    activity.put("price", item.hasNonNull("price") ? item.path("price").asDouble() : null);
                    activity.put("currency", item.path("currency").asText("EUR"));
                    items.add(activity);
                    count++;
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("status", "SUCCESS");
            result.put("source", "YUDING_TRAVEL_API");
            result.put("destination", destination.trim());
            result.put("totalFound", items.size());
            result.put("activities", items);
            if (items.isEmpty()) {
                result.put("note", "Aucune activité trouvée dans le système Yuding pour ces critères exacts.");
            }

            return AiToolResult.success(callId, "searchActivities", result);
        } catch (Exception e) {
            log.error("Activity search tool failed: {}", e.getMessage());
            return AiToolResult.error(callId, "searchActivities", "Erreur lors de la recherche d'activités: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        Object val = args.get(key);
        return val != null ? val.toString() : null;
    }
}
