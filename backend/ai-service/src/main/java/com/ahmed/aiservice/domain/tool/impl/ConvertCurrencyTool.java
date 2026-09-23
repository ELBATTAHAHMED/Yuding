package com.ahmed.aiservice.domain.tool.impl;

import com.ahmed.aiservice.client.InternalTravelClient;
import com.ahmed.aiservice.domain.tool.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Read-only tool for converting amounts between international currencies via travel-service.
 */
@Component
public class ConvertCurrencyTool implements AiTool {

    private static final Logger log = LoggerFactory.getLogger(ConvertCurrencyTool.class);
    private static final Pattern CURRENCY_PATTERN = Pattern.compile("^[A-Za-z]{3}$");

    private final InternalTravelClient travelClient;
    private final AiToolDefinition definition;

    public ConvertCurrencyTool(InternalTravelClient travelClient) {
        this.travelClient = travelClient;
        this.definition = new AiToolDefinition(
                "convertCurrency",
                "Convertit un montant d'une devise à une autre en utilisant les taux de change officiels du système Yuding.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "amount", Map.of("type", "number", "description", "Montant à convertir (valeur numérique positive)"),
                                "from", Map.of("type", "string", "description", "Code ISO 4217 de la devise source (ex: EUR, USD, MAD, GBP)"),
                                "to", Map.of("type", "string", "description", "Code ISO 4217 de la devise cible (ex: MAD, EUR, USD, GBP)")
                        ),
                        "required", List.of("amount", "from", "to")
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

        String from = getString(args, "from");
        String to = getString(args, "to");
        BigDecimal amount = getBigDecimal(args, "amount");

        if (from == null || !CURRENCY_PATTERN.matcher(from.trim()).matches()) {
            return AiToolResult.error(callId, "convertCurrency", "Devise source invalide: '" + from + "'. Doit comporter 3 lettres (ex: EUR, USD, MAD).");
        }
        if (to == null || !CURRENCY_PATTERN.matcher(to.trim()).matches()) {
            return AiToolResult.error(callId, "convertCurrency", "Devise cible invalide: '" + to + "'. Doit comporter 3 lettres (ex: EUR, USD, MAD).");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return AiToolResult.error(callId, "convertCurrency", "Le montant à convertir doit être un nombre strictement positif.");
        }

        String fromNorm = from.trim().toUpperCase();
        String toNorm = to.trim().toUpperCase();

        try {
            JsonNode snapshot = travelClient.convertCurrency(amount, fromNorm, toNorm);
            if (snapshot == null) {
                return AiToolResult.error(callId, "convertCurrency", "Taux de change indisponible pour " + fromNorm + " -> " + toNorm);
            }

            double rate = snapshot.path("exchangeRate").asDouble(1.0);
            BigDecimal converted = amount.multiply(BigDecimal.valueOf(rate)).setScale(2, RoundingMode.HALF_UP);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("from", fromNorm);
            result.put("to", toNorm);
            result.put("originalAmount", amount);
            result.put("convertedAmount", converted.doubleValue());
            result.put("exchangeRate", rate);
            result.put("rateDate", snapshot.path("exchangeRateDate").asText(""));
            result.put("provider", snapshot.path("exchangeRateProvider").asText("official"));

            return AiToolResult.success(callId, "convertCurrency", result);
        } catch (Exception e) {
            log.error("Currency conversion tool failed: {}", e.getMessage());
            return AiToolResult.error(callId, "convertCurrency", "Erreur lors de la conversion de devise: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        Object val = args.get(key);
        return val != null ? val.toString() : null;
    }

    private BigDecimal getBigDecimal(Map<String, Object> args, String key) {
        Object val = args.get(key);
        if (val instanceof Number num) {
            return BigDecimal.valueOf(num.doubleValue()).setScale(4, RoundingMode.HALF_UP);
        }
        if (val instanceof String str && !str.isBlank()) {
            try {
                return new BigDecimal(str.trim()).setScale(4, RoundingMode.HALF_UP);
            } catch (NumberFormatException ignored) {}
        }
        return null;
    }
}
