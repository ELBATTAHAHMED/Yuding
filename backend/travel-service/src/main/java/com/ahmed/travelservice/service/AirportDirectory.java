package com.ahmed.travelservice.service;

import com.ahmed.travelservice.dto.response.AirportDto;

import java.util.*;

/**
 * Global directory of essential international and regional airports with coordinates.
 * Used for dynamic location and destination resolution across travel services.
 */
public final class AirportDirectory {

    private AirportDirectory() {}

    public static final List<AirportDto> ESSENTIAL_AIRPORTS = List.of(
            // Morocco
            AirportDto.builder().code("CMN").name("Mohammed V International Airport").city("Casablanca").country("Morocco").latitude(33.3675).longitude(-7.5898).cityLatitude(33.5951).cityLongitude(-7.6187).build(),
            AirportDto.builder().code("RAK").name("Marrakech Menara Airport").city("Marrakech").country("Morocco").latitude(31.6069).longitude(-8.0363).cityLatitude(31.6295).cityLongitude(-7.9811).build(),
            AirportDto.builder().code("RBA").name("Rabat-Salé Airport").city("Rabat").country("Morocco").latitude(34.0515).longitude(-6.7515).cityLatitude(34.0209).cityLongitude(-6.8416).build(),
            AirportDto.builder().code("TNG").name("Tangier Ibn Battouta Airport").city("Tangier").country("Morocco").latitude(35.7269).longitude(-5.9169).cityLatitude(35.7595).cityLongitude(-5.8340).build(),
            AirportDto.builder().code("AGA").name("Agadir-Al Massira Airport").city("Agadir").country("Morocco").latitude(30.3808).longitude(-9.4131).cityLatitude(30.4278).cityLongitude(-9.5981).build(),
            AirportDto.builder().code("FEZ").name("Fès-Saïss Airport").city("Fez").country("Morocco").latitude(33.9273).longitude(-4.9780).cityLatitude(34.0331).cityLongitude(-5.0003).build(),
            AirportDto.builder().code("NDR").name("Nador El Aroui Airport").city("Nador").country("Morocco").latitude(34.9889).longitude(-3.0283).cityLatitude(35.1667).cityLongitude(-2.9333).build(),
            AirportDto.builder().code("OUJ").name("Angads Airport").city("Oujda").country("Morocco").latitude(34.7872).longitude(-1.9239).cityLatitude(34.6814).cityLongitude(-1.9086).build(),
            AirportDto.builder().code("OZZ").name("Ouarzazate Airport").city("Ouarzazate").country("Morocco").latitude(30.9392).longitude(-6.9094).cityLatitude(30.9189).cityLongitude(-6.9150).build(),
            AirportDto.builder().code("ESU").name("Essaouira-Mogador Airport").city("Essaouira").country("Morocco").latitude(31.3975).longitude(-9.6817).cityLatitude(31.5085).cityLongitude(-9.7595).build(),
            AirportDto.builder().code("VIL").name("Dakhla Airport").city("Dakhla").country("Morocco").latitude(23.7183).longitude(-15.9320).cityLatitude(23.7221).cityLongitude(-15.9347).build(),

            // Europe & Americas & Middle East & Asia
            AirportDto.builder().code("CDG").name("Charles de Gaulle Airport").city("Paris").country("France").latitude(49.0097).longitude(2.5479).cityLatitude(48.8566).cityLongitude(2.3522).build(),
            AirportDto.builder().code("ORY").name("Paris Orly Airport").city("Paris").country("France").latitude(48.7262).longitude(2.3652).cityLatitude(48.8566).cityLongitude(2.3522).build(),
            AirportDto.builder().code("MAD").name("Adolfo Suárez Madrid-Barajas Airport").city("Madrid").country("Spain").latitude(40.4839).longitude(-3.5680).cityLatitude(40.4168).cityLongitude(-3.7038).build(),
            AirportDto.builder().code("BCN").name("Josep Tarradellas Barcelona-El Prat Airport").city("Barcelona").country("Spain").latitude(41.2974).longitude(2.0833).cityLatitude(41.3851).cityLongitude(2.1734).build(),
            AirportDto.builder().code("FCO").name("Leonardo da Vinci–Fiumicino Airport").city("Rome").country("Italy").latitude(41.8003).longitude(12.2389).cityLatitude(41.9028).cityLongitude(12.4964).build(),
            AirportDto.builder().code("LHR").name("London Heathrow Airport").city("London").country("United Kingdom").latitude(51.4700).longitude(-0.4543).cityLatitude(51.5074).cityLongitude(-0.1278).build(),
            AirportDto.builder().code("LGW").name("London Gatwick Airport").city("London").country("United Kingdom").latitude(51.1537).longitude(-0.1821).cityLatitude(51.5074).cityLongitude(-0.1278).build(),
            AirportDto.builder().code("DXB").name("Dubai International Airport").city("Dubai").country("United Arab Emirates").latitude(25.2532).longitude(55.3657).cityLatitude(25.1972).cityLongitude(55.2744).build(),
            AirportDto.builder().code("IST").name("Istanbul Airport").city("Istanbul").country("Turkey").latitude(41.2753).longitude(28.7519).cityLatitude(41.0082).cityLongitude(28.9784).build(),
            AirportDto.builder().code("JFK").name("John F. Kennedy International Airport").city("New York").country("United States").latitude(40.6413).longitude(-73.7781).cityLatitude(40.7128).cityLongitude(-74.0060).build()
    );

    /**
     * Finds an airport matching by exact IATA code, city name, or airport name (diacritic- and case-insensitive).
     */
    public static Optional<AirportDto> findAirport(String query) {
        if (query == null || query.isBlank()) {
            return Optional.empty();
        }
        String cleanQuery = query.contains(",") ? query.split(",")[0].trim() : query.trim();
        String qRaw = cleanQuery.toUpperCase(Locale.ROOT);
        String qClean = stripDiacritics(cleanQuery);

        // Normalize common transliteration / spelling variations
        String qCanonical = normalizeCityAlias(qClean);

        // 1. Direct IATA code match
        for (AirportDto a : ESSENTIAL_AIRPORTS) {
            if (a.getCode().equalsIgnoreCase(qRaw) || a.getCode().equalsIgnoreCase(qCanonical)) {
                return Optional.of(a);
            }
        }

        // 2. City or airport name match (normalized)
        for (AirportDto a : ESSENTIAL_AIRPORTS) {
            String cityClean = stripDiacritics(a.getCity());
            String nameClean = stripDiacritics(a.getName());

            if (!cityClean.isEmpty() && (qClean.contains(cityClean) || cityClean.contains(qClean) || qCanonical.contains(cityClean) || cityClean.contains(qCanonical))) {
                return Optional.of(a);
            }
            if (!nameClean.isEmpty() && (qClean.contains(nameClean) || nameClean.contains(qClean) || qCanonical.contains(nameClean) || nameClean.contains(qCanonical))) {
                return Optional.of(a);
            }
        }

        return Optional.empty();
    }

    /**
     * Normalizes a raw city name or location string into its canonical provider-accepted city name.
     * E.g. "Marrakesh" -> "Marrakech", "Fez" -> "Fes", "Barcelone" -> "Barcelona", etc.
     */
    public static String normalizeCityName(String raw) {
        if (raw == null || raw.isBlank()) return "";
        String s = stripDiacritics(raw.contains(",") ? raw.split(",")[0].trim() : raw.trim());
        if (s.contains("MARRAKESH") || s.contains("MARRAKECH")) return "Marrakech";
        if (s.contains("FES") || s.contains("FEZ")) return "Fes";
        if (s.contains("TANGER") || s.contains("TANGIER")) return "Tangier";
        if (s.contains("CASA") || s.contains("CASABLANCA")) return "Casablanca";
        if (s.contains("BARCELONE") || s.contains("BARCELONA")) return "Barcelona";
        if (s.contains("LONDRES") || s.contains("LONDON")) return "London";
        if (s.contains("ROMA") || s.contains("ROME")) return "Rome";
        if (s.contains("PARIS")) return "Paris";
        if (s.contains("MADRID")) return "Madrid";
        if (s.contains("AGADIR")) return "Agadir";
        if (s.contains("RABAT")) return "Rabat";
        if (s.contains("CHEFCHAOUEN")) return "Chefchaouen";
        if (s.contains("ESSAOUIRA")) return "Essaouira";
        if (s.contains("DAKHLA")) return "Dakhla";
        if (s.contains("OUARZAZATE")) return "Ouarzazate";
        if (s.contains("DUBAI")) return "Dubai";
        if (s.contains("ISTANBUL")) return "Istanbul";
        return raw.trim();
    }

    private static String normalizeCityAlias(String clean) {
        if (clean == null) return "";
        if (clean.contains("MARRAKESH") || clean.contains("MARRAKECH")) return "MARRAKECH";
        if (clean.contains("FES") || clean.contains("FEZ")) return "FEZ";
        if (clean.contains("TANGER") || clean.contains("TANGIER")) return "TANGIER";
        if (clean.contains("CASA") || clean.contains("CASABLANCA")) return "CASABLANCA";
        if (clean.contains("BARCELONE") || clean.contains("BARCELONA")) return "BARCELONA";
        if (clean.contains("LONDRES") || clean.contains("LONDON")) return "LONDON";
        if (clean.contains("ROMA") || clean.contains("ROME")) return "ROME";
        return clean;
    }

    public static String resolveCountryCode(String location) {
        if (location == null || location.isBlank()) return "MA";
        String s = stripDiacritics(location);
        if (s.contains("FRANCE") || s.contains("PARIS") || s.contains("NICE") || s.contains("LYON") || s.contains("MARSEILLE")) return "FR";
        if (s.contains("SPAIN") || s.contains("ESPAGNE") || s.contains("MADRID") || s.contains("BARCELONA") || s.contains("BARCELONE") || s.contains("SEVILLE")) return "ES";
        if (s.contains("ITALY") || s.contains("ITALIE") || s.contains("ROME") || s.contains("ROMA") || s.contains("MILAN") || s.contains("VENISE") || s.contains("FLORENCE")) return "IT";
        if (s.contains("UNITED KINGDOM") || s.contains("ROYAUME UNI") || s.contains("LONDON") || s.contains("LONDRES") || s.contains("MANCHESTER")) return "GB";
        if (s.contains("UNITED STATES") || s.contains("ETATS UNIS") || s.contains("NEW YORK") || s.contains("MIAMI") || s.contains("LOS ANGELES")) return "US";
        if (s.contains("UNITED ARAB EMIRATES") || s.contains("EMIRATS") || s.contains("DUBAI") || s.contains("ABU DHABI")) return "AE";
        if (s.contains("TURKEY") || s.contains("TURQUIE") || s.contains("ISTANBUL") || s.contains("ANTALYA")) return "TR";

        Optional<AirportDto> airport = findAirport(location);
        if (airport.isPresent()) {
            String country = airport.get().getCountry();
            if ("France".equalsIgnoreCase(country)) return "FR";
            if ("Spain".equalsIgnoreCase(country)) return "ES";
            if ("Italy".equalsIgnoreCase(country)) return "IT";
            if ("United Kingdom".equalsIgnoreCase(country)) return "GB";
            if ("United States".equalsIgnoreCase(country)) return "US";
            if ("United Arab Emirates".equalsIgnoreCase(country)) return "AE";
            if ("Turkey".equalsIgnoreCase(country)) return "TR";
            if ("Morocco".equalsIgnoreCase(country)) return "MA";
        }
        return "MA";
    }

    public static String stripDiacritics(String str) {
        if (str == null) return "";
        String n = java.text.Normalizer.normalize(str, java.text.Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}", "").replaceAll("[-_]", " ").replaceAll("\\s+", " ").trim().toUpperCase(Locale.ROOT);
    }
}
