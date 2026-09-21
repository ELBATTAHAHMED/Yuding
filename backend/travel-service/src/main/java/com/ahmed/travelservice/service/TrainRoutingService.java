package com.ahmed.travelservice.service;

import com.ahmed.travelservice.domain.query.TrainSearchQuery;
import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.dto.response.TrainStationDto;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.gtfs.OncfGtfsIndex;
import com.ahmed.travelservice.provider.impl.gtfs.OncfGtfsTrainProvider;
import com.ahmed.travelservice.provider.impl.transitous.TransitousTrainProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;

/**
 * Intelligent routing layer for train searches and station autocomplete.
 * Architecture:
 * - Morocco: ONCF GTFS local provider (primary for domestic Moroccan rail network)
 * - Global: Transitous provider (international public transport and rail journeys)
 */
@Service
public class TrainRoutingService {

    private static final Logger log = LoggerFactory.getLogger(TrainRoutingService.class);

    private final OncfGtfsTrainProvider oncfGtfsTrainProvider;
    private final TransitousTrainProvider transitousTrainProvider;

    public TrainRoutingService(OncfGtfsTrainProvider oncfGtfsTrainProvider,
                               TransitousTrainProvider transitousTrainProvider) {
        this.oncfGtfsTrainProvider = oncfGtfsTrainProvider;
        this.transitousTrainProvider = transitousTrainProvider;
    }

    /**
     * Dispatches train search to the appropriate provider based on origin/destination geography.
     * Moroccan domestic routes use the local ONCF GTFS dataset as primary authority.
     * International or cross-border routes use Transitous.
     */
    public List<TrainOfferDto> searchTrains(TrainSearchQuery query) throws TravelProviderException {
        if (query == null) {
            throw TravelProviderException.badRequest("Train search query cannot be null");
        }

        boolean originIsOncf = isMoroccanStation(query.getOriginStation(), query.getOriginCountryCode());
        boolean destIsOncf = isMoroccanStation(query.getDestinationStation(), query.getDestinationCountryCode());

        // Both stations in Moroccan ONCF network -> Use ONCF GTFS provider first
        if (originIsOncf && destIsOncf) {
            log.info("TrainRouting: Routing domestic Moroccan search [{} -> {}] to ONCF GTFS provider",
                    query.getOriginStation(), query.getDestinationStation());
            try {
                List<TrainOfferDto> offers = oncfGtfsTrainProvider.searchTrains(query);
                if (offers != null && !offers.isEmpty()) {
                    return offers;
                }
            } catch (TravelProviderException e) {
                // If it's a date freshness gate rejection, rethrow so the user gets the official ONCF notice
                if (e.getErrorCode() == ProviderErrorCode.SCHEDULE_DATA_OUTDATED) {
                    throw e;
                }
                log.warn("TrainRouting: ONCF GTFS provider search failed: {}. Attempting fallback to Transitous.", e.getMessage());
            }

            // Controlled fallback to Transitous if ONCF yields no results
            log.info("TrainRouting: Falling back to Transitous for [{} -> {}]",
                    query.getOriginStation(), query.getDestinationStation());
            return transitousTrainProvider.searchTrains(query);
        }

        // International or non-ONCF journey -> Transitous provider
        log.info("TrainRouting: Routing international journey [{} -> {}] to Transitous provider",
                query.getOriginStation(), query.getDestinationStation());
        return transitousTrainProvider.searchTrains(query);
    }

    /**
     * Unified location and station autocomplete.
     * Combines local ONCF stations (priority for Morocco) with global Transitous places.
     */
    public List<TrainStationDto> searchStations(String query) {
        // Return full ONCF directory if query is empty
        if (query == null || query.isBlank()) {
            return oncfGtfsTrainProvider.getTrainStations();
        }

        String normalizedQuery = normalize(query.trim());
        List<TrainStationDto> merged = new ArrayList<>();
        Set<String> seenKeys = new HashSet<>();

        // 1. Search local ONCF stations in memory (instant, 0 network)
        try {
            List<TrainStationDto> oncfStations = oncfGtfsTrainProvider.getTrainStations();
            for (TrainStationDto s : oncfStations) {
                String nameNorm = normalize(s.getName());
                String cityNorm = s.getCity() != null ? normalize(s.getCity()) : "";
                String idNorm = s.getId() != null ? normalize(s.getId()) : "";

                if (nameNorm.contains(normalizedQuery) || cityNorm.contains(normalizedQuery) || idNorm.contains(normalizedQuery)) {
                    String key = nameNorm + "_MA";
                    if (seenKeys.add(key)) {
                        merged.add(s);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("TrainRouting: Error reading local ONCF stations: {}", e.getMessage());
        }

        // 2. Search Transitous global places if query length >= 2
        if (query.trim().length() >= 2) {
            try {
                List<TrainStationDto> globalResults = transitousTrainProvider.searchStations(query.trim());
                for (TrainStationDto s : globalResults) {
                    String country = s.getCountryCode() != null ? s.getCountryCode().toUpperCase(Locale.ROOT) : "GLOBAL";
                    String nameNorm = normalize(s.getName());
                    String key = nameNorm + "_" + country;

                    // If it's a Moroccan station already matched by ONCF, prioritize local ONCF entry
                    if ("MA".equals(country) && seenKeys.contains(nameNorm + "_MA")) {
                        continue;
                    }

                    if (seenKeys.add(key)) {
                        merged.add(s);
                    }

                    if (merged.size() >= 20) {
                        break;
                    }
                }
            } catch (Exception e) {
                log.warn("TrainRouting: Global Transitous geocode lookup failed: {}", e.getMessage());
            }
        }

        return merged;
    }

    /**
     * Checks if a given station name or country belongs to the local ONCF Moroccan rail network.
     */
    public boolean isMoroccanStation(String stationNameOrId, String countryCode) {
        if ("MA".equalsIgnoreCase(countryCode)) {
            return true;
        }
        if (stationNameOrId == null || stationNameOrId.isBlank()) {
            return false;
        }

        OncfGtfsIndex index = oncfGtfsTrainProvider.getGtfsIndex();
        if (index != null && index.isLoaded()) {
            return index.resolveStation(stationNameOrId) != null;
        }

        return false;
    }

    private String normalize(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }
}
