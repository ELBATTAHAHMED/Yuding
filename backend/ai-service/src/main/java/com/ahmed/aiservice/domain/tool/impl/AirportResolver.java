package com.ahmed.aiservice.domain.tool.impl;

import com.ahmed.aiservice.client.InternalTravelClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Resolves user/assistant city names and airport names into valid 3-letter IATA codes.
 * Backed by essential static hubs and dynamic airport discovery from travel-service.
 */
@Component
public class AirportResolver {

    private static final Logger log = LoggerFactory.getLogger(AirportResolver.class);
    private static final Pattern IATA_PATTERN = Pattern.compile("^[A-Za-z]{3}$");

    private final InternalTravelClient travelClient;
    private final Map<String, String> cityToIata = new ConcurrentHashMap<>();

    private static final Map<String, String> ESSENTIAL_MAPPINGS = Map.ofEntries(
            // Morocco
            Map.entry("CASABLANCA", "CMN"),
            Map.entry("MARRAKECH", "RAK"),
            Map.entry("RABAT", "RBA"),
            Map.entry("TANGER", "TNG"),
            Map.entry("TANGIER", "TNG"),
            Map.entry("AGADIR", "AGA"),
            Map.entry("FEZ", "FEZ"),
            Map.entry("FES", "FEZ"),
            Map.entry("NADOR", "NDR"),
            Map.entry("OUJDA", "OUJ"),
            Map.entry("OUARZAZATE", "OZZ"),
            // Europe
            Map.entry("PARIS", "CDG"),
            Map.entry("MADRID", "MAD"),
            Map.entry("BARCELONE", "BCN"),
            Map.entry("BARCELONA", "BCN"),
            Map.entry("ROME", "FCO"),
            Map.entry("ROMA", "FCO"),
            Map.entry("LONDRES", "LHR"),
            Map.entry("LONDON", "LHR"),
            Map.entry("NICE", "NCE"),
            Map.entry("LYON", "LYS"),
            Map.entry("MARSEILLE", "MRS"),
            // Middle East & US
            Map.entry("DUBAI", "DXB"),
            Map.entry("ISTANBUL", "IST"),
            Map.entry("NEW YORK", "JFK")
    );

    public AirportResolver(InternalTravelClient travelClient) {
        this.travelClient = travelClient;
        ESSENTIAL_MAPPINGS.forEach((k, v) -> cityToIata.put(normalize(k), v));
    }

    public Optional<String> resolveToIata(String input) {
        if (input == null || input.isBlank()) {
            return Optional.empty();
        }
        String trimmed = input.trim();

        // 1. Direct IATA code (3 letters)
        if (IATA_PATTERN.matcher(trimmed).matches()) {
            return Optional.of(trimmed.toUpperCase(Locale.ROOT));
        }

        // 2. Direct exact or substring city match
        String norm = normalize(trimmed);
        if (cityToIata.containsKey(norm)) {
            return Optional.of(cityToIata.get(norm));
        }

        for (Map.Entry<String, String> entry : cityToIata.entrySet()) {
            if (norm.contains(entry.getKey()) || entry.getKey().contains(norm)) {
                return Optional.of(entry.getValue());
            }
        }

        // 3. Dynamic lookup from travel-service directory
        try {
            JsonNode airports = travelClient.getAirports();
            if (airports != null && airports.isArray()) {
                for (JsonNode a : airports) {
                    String code = a.path("code").asText("");
                    String city = normalize(a.path("city").asText(""));
                    String name = normalize(a.path("name").asText(""));
                    if (!code.isBlank()) {
                        if (!city.isBlank()) cityToIata.put(city, code);
                        if (!name.isBlank()) cityToIata.put(name, code);
                        if (norm.equals(city) || norm.equals(name) || (city.length() >= 3 && norm.contains(city)) || (norm.length() >= 3 && city.contains(norm))) {
                            return Optional.of(code);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("AirportResolver: Dynamic lookup failed for '{}': {}", input, e.getMessage());
        }

        return Optional.empty();
    }

    private static String normalize(String str) {
        if (str == null) return "";
        String n = Normalizer.normalize(str, Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}", "")
                .replaceAll("[-_]", " ")
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);
    }
}
