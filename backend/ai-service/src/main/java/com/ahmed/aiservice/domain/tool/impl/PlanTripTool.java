package com.ahmed.aiservice.domain.tool.impl;

import com.ahmed.aiservice.domain.planner.dto.TripPlanDto;
import com.ahmed.aiservice.domain.planner.dto.TripPlanRequest;
import com.ahmed.aiservice.domain.planner.service.TripPlannerService;
import com.ahmed.aiservice.domain.tool.AiTool;
import com.ahmed.aiservice.domain.tool.AiToolCall;
import com.ahmed.aiservice.domain.tool.AiToolDefinition;
import com.ahmed.aiservice.domain.tool.AiToolExecutionContext;
import com.ahmed.aiservice.domain.tool.AiToolResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.*;

@Component
@Slf4j
public class PlanTripTool implements AiTool {

    private final TripPlannerService tripPlannerService;
    private final AiToolDefinition definition;

    public PlanTripTool(TripPlannerService tripPlannerService) {
        this.tripPlannerService = tripPlannerService;
        this.definition = new AiToolDefinition(
                "planTrip",
                "Génère et sauvegarde un plan de voyage complet, personnalisé et chiffré (vols réels, hébergements, activités, météo et budget calculé). À utiliser quand l'utilisateur demande explicitement de planifier un voyage ou d'organiser un séjour avec des dates et un budget.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "origin", Map.of("type", "string", "description", "Ville ou aéroport de départ (ex: Casablanca, CMN, Paris)"),
                                "destination", Map.of("type", "string", "description", "Ville de destination (ex: Paris, Marrakech, Rome)"),
                                "startDate", Map.of("type", "string", "description", "Date de début du séjour au format YYYY-MM-DD"),
                                "endDate", Map.of("type", "string", "description", "Date de fin du séjour au format YYYY-MM-DD"),
                                "budget", Map.of("type", "number", "description", "Budget total alloué (ex: 8000)"),
                                "budgetCurrency", Map.of("type", "string", "description", "Devise du budget (ex: MAD, EUR, USD, défaut MAD)"),
                                "travelers", Map.of("type", "integer", "description", "Nombre de voyageurs (défaut: 1)"),
                                "preferences", Map.of("type", "array", "items", Map.of("type", "string"), "description", "Centres d'intérêt ou préférences (ex: ['food', 'museums', 'culture'])"),
                                "pace", Map.of("type", "string", "description", "Rythme souhaité: relaxed, moderate, fast")
                        ),
                        "required", List.of("origin", "destination", "startDate", "endDate", "budget")
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
        String startDateStr = getString(args, "startDate");
        String endDateStr = getString(args, "endDate");
        BigDecimal budget = getBigDecimal(args, "budget");
        String budgetCurrency = getString(args, "budgetCurrency", "MAD");
        int travelers = getInt(args, "travelers", 1);
        String pace = getString(args, "pace", "moderate");
        List<String> preferences = getList(args, "preferences");

        if (origin == null || origin.isBlank()) {
            return AiToolResult.error(callId, "planTrip", "La ville d'origine est obligatoire.");
        }
        if (destination == null || destination.isBlank()) {
            return AiToolResult.error(callId, "planTrip", "La ville de destination est obligatoire.");
        }
        if (startDateStr == null || endDateStr == null) {
            return AiToolResult.error(callId, "planTrip", "Les dates de début et de fin sont obligatoires (format YYYY-MM-DD).");
        }
        if (budget == null || budget.compareTo(BigDecimal.ZERO) <= 0) {
            return AiToolResult.error(callId, "planTrip", "Un budget positif est obligatoire.");
        }

        LocalDate startDate;
        LocalDate endDate;
        try {
            startDate = LocalDate.parse(startDateStr.trim());
            endDate = LocalDate.parse(endDateStr.trim());
        } catch (DateTimeParseException e) {
            return AiToolResult.error(callId, "planTrip", "Format de date invalide: " + e.getMessage() + ". Format attendu: YYYY-MM-DD.");
        }

        UUID userId = null;
        if (context.getUserId() != null) {
            try {
                userId = UUID.fromString(context.getUserId());
            } catch (IllegalArgumentException ignored) {}
        }
        if (userId == null) {
            return AiToolResult.error(callId, "planTrip", "Authentification requise pour générer et enregistrer un itinéraire.");
        }

        TripPlanRequest request = TripPlanRequest.builder()
                .origin(origin)
                .destination(destination)
                .startDate(startDate)
                .endDate(endDate)
                .budget(budget)
                .budgetCurrency(budgetCurrency)
                .travelers(travelers)
                .preferences(preferences)
                .pace(pace)
                .build();

        try {
            TripPlanDto result = tripPlannerService.planTrip(request, userId);
            Map<String, Object> output = new LinkedHashMap<>();
            output.put("reference", result.getReference());
            output.put("title", result.getTitle());
            output.put("origin", result.getOrigin());
            output.put("destination", result.getDestination());
            output.put("startDate", result.getStartDate().toString());
            output.put("endDate", result.getEndDate().toString());
            output.put("travelers", result.getTravelers());
            output.put("budget", result.getBudget());
            output.put("budgetCurrency", result.getBudgetCurrency());
            output.put("pricedTotal", result.getPricedTotal());
            output.put("remainingBudget", result.getRemainingBudget());
            output.put("unpricedItemsCount", result.getUnpricedItemsCount());
            output.put("budgetStatus", result.getBudgetStatus());
            output.put("summary", result.getSummary());
            output.put("flight", result.getFlight());
            output.put("hotel", result.getHotel());
            output.put("days", result.getDays());
            output.put("weatherSummary", result.getWeatherSummary());
            output.put("sources", result.getSources());
            output.put("warnings", result.getWarnings());

            return AiToolResult.success(callId, "planTrip", output);
        } catch (Exception e) {
            log.error("PlanTripTool execution failed: {}", e.getMessage(), e);
            return AiToolResult.error(callId, "planTrip", "Échec de la planification du voyage: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        return getString(args, key, null);
    }

    private String getString(Map<String, Object> args, String key, String defaultVal) {
        Object val = args.get(key);
        return val != null ? val.toString().trim() : defaultVal;
    }

    private int getInt(Map<String, Object> args, String key, int defaultVal) {
        Object val = args.get(key);
        if (val instanceof Number n) return n.intValue();
        if (val instanceof String s) {
            try { return Integer.parseInt(s.trim()); } catch (NumberFormatException ignored) {}
        }
        return defaultVal;
    }

    private BigDecimal getBigDecimal(Map<String, Object> args, String key) {
        Object val = args.get(key);
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        if (val instanceof String s) {
            try { return new BigDecimal(s.trim()); } catch (NumberFormatException ignored) {}
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<String> getList(Map<String, Object> args, String key) {
        Object val = args.get(key);
        if (val instanceof List<?> l) {
            return l.stream().map(Object::toString).toList();
        }
        return Collections.emptyList();
    }
}
