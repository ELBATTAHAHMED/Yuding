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
 * Read-only tool for airport and city transfer / taxi search via travel-service.
 */
@Component
public class SearchTransfersTool implements AiTool {

    private static final Logger log = LoggerFactory.getLogger(SearchTransfersTool.class);
    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");
    private static final Pattern TIME_PATTERN = Pattern.compile("^\\d{2}:\\d{2}$");

    private final InternalTravelClient travelClient;
    private final int maxResults;
    private final AiToolDefinition definition;

    public SearchTransfersTool(InternalTravelClient travelClient,
                               @Value("${yuding.ai.max-tool-results:5}") int maxResults) {
        this.travelClient = travelClient;
        this.maxResults = maxResults;
        this.definition = new AiToolDefinition(
                "searchTransfers",
                "Recherche les transferts privés ou taxis entre un point de départ et une destination. Renvoie les offres vérifiées avec tarifs et types de véhicules.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "pickup", Map.of("type", "string", "description", "Lieu de prise en charge (ex: Aéroport Paris CDG, Gare Montparnasse)"),
                                "dropoff", Map.of("type", "string", "description", "Lieu de dépose (ex: Tour Eiffel, Hôtel de Ville)"),
                                "date", Map.of("type", "string", "description", "Date du transfert au format YYYY-MM-DD"),
                                "time", Map.of("type", "string", "description", "Heure de prise en charge au format HH:mm (défaut: 10:00)"),
                                "passengers", Map.of("type", "integer", "description", "Nombre de passagers (défaut: 1)"),
                                "currency", Map.of("type", "string", "description", "Devise souhaitée (ex: EUR, MAD, USD)")
                        ),
                        "required", List.of("pickup", "dropoff", "date")
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

        String pickup = getString(args, "pickup");
        String dropoff = getString(args, "dropoff");
        String date = getString(args, "date");

        if (pickup == null || pickup.trim().length() < 2) {
            return AiToolResult.error(callId, "searchTransfers", "Lieu de départ (pickup) invalide ou trop court.");
        }
        if (dropoff == null || dropoff.trim().length() < 2) {
            return AiToolResult.error(callId, "searchTransfers", "Lieu d'arrivée (dropoff) invalide ou trop court.");
        }
        if (pickup.trim().equalsIgnoreCase(dropoff.trim())) {
            return AiToolResult.error(callId, "searchTransfers", "Le lieu de prise en charge et le lieu de dépose ne peuvent pas être identiques.");
        }
        if (date == null || !DATE_PATTERN.matcher(date.trim()).matches()) {
            return AiToolResult.error(callId, "searchTransfers", "Format de date invalide: '" + date + "'. Format attendu: YYYY-MM-DD.");
        }

        String time = getString(args, "time");
        if (time == null || !TIME_PATTERN.matcher(time.trim()).matches()) {
            time = "10:00";
        }

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("pickup", pickup.trim());
        request.put("dropoff", dropoff.trim());
        request.put("date", date.trim());
        request.put("time", time.trim());

        int passengers = 1;
        if (args.get("passengers") instanceof Number num) {
            passengers = Math.max(1, Math.min(20, num.intValue()));
        }
        request.put("passengers", passengers);
        request.put("transferType", "TAXI");

        String currency = getString(args, "currency");
        if (currency != null && currency.trim().length() == 3) {
            request.put("currency", currency.trim().toUpperCase());
        } else {
            request.put("currency", "EUR");
        }

        try {
            JsonNode response = travelClient.searchTransfers(request);
            if (response != null && "PROVIDER_UNAVAILABLE".equalsIgnoreCase(response.path("status").asText())) {
                String errorMsg = response.path("message").asText("Le service de recherche de transferts est temporairement indisponible.");
                return AiToolResult.error(callId, "searchTransfers", errorMsg);
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
                    Map<String, Object> transfer = new LinkedHashMap<>();
                    String id = item.hasNonNull("offerId") ? item.path("offerId").asText() : item.path("id").asText("");
                    if (id.length() > 50) id = id.substring(0, 50);
                    transfer.put("id", id);
                    transfer.put("vehicleType", item.hasNonNull("transferType") ? item.path("transferType").asText() : item.path("vehicleType").asText("TAXI"));
                    transfer.put("vehicleDescription", item.hasNonNull("vehicleModel") ? item.path("vehicleModel").asText() : item.path("vehicleDescription").asText(""));
                    transfer.put("maxPassengers", item.hasNonNull("capacity") ? item.path("capacity").asInt() : item.path("maxPassengers").asInt(passengers));
                    transfer.put("pickup", item.hasNonNull("pickup") ? item.path("pickup").asText() : pickup);
                    transfer.put("dropoff", item.hasNonNull("dropoff") ? item.path("dropoff").asText() : dropoff);
                    transfer.put("durationMinutes", item.path("durationMinutes").asInt(0));
                    transfer.put("price", item.hasNonNull("price") ? item.path("price").asDouble() : null);
                    transfer.put("currency", item.path("currency").asText("EUR"));
                    items.add(transfer);
                    count++;
                }
            }

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("status", "SUCCESS");
            result.put("source", "YUDING_TRAVEL_API");
            result.put("pickup", pickup.trim());
            result.put("dropoff", dropoff.trim());
            result.put("date", date.trim());
            result.put("time", time.trim());
            result.put("totalFound", items.size());
            result.put("transfers", items);
            if (items.isEmpty()) {
                result.put("note", "Aucun transfert trouvé dans le système Yuding pour ces critères exacts.");
            }

            return AiToolResult.success(callId, "searchTransfers", result);
        } catch (Exception e) {
            log.error("Transfer search tool failed: {}", e.getMessage());
            return AiToolResult.error(callId, "searchTransfers", "Erreur lors de la recherche de transferts: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        Object val = args.get(key);
        return val != null ? val.toString() : null;
    }
}
