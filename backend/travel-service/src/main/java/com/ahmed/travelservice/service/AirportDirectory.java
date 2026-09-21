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
        String qRaw = query.trim().toUpperCase(Locale.ROOT);
        String qClean = stripDiacritics(query);

        // 1. Direct IATA code match
        for (AirportDto a : ESSENTIAL_AIRPORTS) {
            if (a.getCode().equalsIgnoreCase(qRaw)) {
                return Optional.of(a);
            }
        }

        // 2. City or airport name match (normalized)
        for (AirportDto a : ESSENTIAL_AIRPORTS) {
            String cityClean = stripDiacritics(a.getCity());
            String nameClean = stripDiacritics(a.getName());

            if (!cityClean.isEmpty() && (qClean.contains(cityClean) || cityClean.contains(qClean))) {
                return Optional.of(a);
            }
            if (!nameClean.isEmpty() && (qClean.contains(nameClean) || nameClean.contains(qClean))) {
                return Optional.of(a);
            }
            // City alias support: Fez <-> Fes
            if ("FEZ".equalsIgnoreCase(a.getCode()) && (qClean.contains("FES") || qClean.contains("FEZ"))) {
                return Optional.of(a);
            }
        }

        return Optional.empty();
    }

    private static String stripDiacritics(String str) {
        if (str == null) return "";
        String n = java.text.Normalizer.normalize(str, java.text.Normalizer.Form.NFD);
        return n.replaceAll("\\p{M}", "").replaceAll("[-_]", " ").replaceAll("\\s+", " ").trim().toUpperCase(Locale.ROOT);
    }
}
