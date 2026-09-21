package com.ahmed.travelservice.provider.impl.gtfs;

import com.ahmed.travelservice.config.OncfGtfsProperties;
import com.ahmed.travelservice.domain.query.TrainSearchQuery;
import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.dto.response.TrainStationDto;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.util.List;
import java.util.Set;

/**
 * High-performance, offline-first train provider using verified community ONCF GTFS datasets.
 * Enforces dynamic schedule calendar validation, zero price invention, and timetable accuracy.
 */
@Component("oncfGtfsTrainProvider")
public class OncfGtfsTrainProvider implements TravelProvider {

    private static final Logger log = LoggerFactory.getLogger(OncfGtfsTrainProvider.class);

    private final OncfGtfsProperties properties;
    private final OncfGtfsIndex gtfsIndex = new OncfGtfsIndex();

    private final ProviderMetadata metadata = ProviderMetadata.builder()
            .providerCode("ONCF_GTFS")
            .displayName("ONCF GTFS (Local Verified Schedule Dataset)")
            .supportedCapabilities(Set.of(ProviderCapability.TRAINS))
            .build();

    public OncfGtfsTrainProvider(OncfGtfsProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    public void init() {
        if (!properties.isEnabled()) {
            log.info("ONCF GTFS train provider is disabled via configuration.");
            return;
        }

        File dataDir = resolveDataDirectory(properties.getDataPath());
        boolean loaded = false;
        if (dataDir != null && dataDir.exists() && dataDir.isDirectory()) {
            try {
                gtfsIndex.loadFromDirectory(dataDir);
                loaded = true;
            } catch (Exception e) {
                log.error("Failed to load ONCF GTFS dataset from {}: {}", dataDir.getAbsolutePath(), e.getMessage());
            }
        } else {
            log.warn("ONCF GTFS data directory not found at '{}'. Run scripts/update-oncf-gtfs.ps1 to download dataset.",
                    properties.getDataPath());
        }

        logStartupDiagnostics(loaded, dataDir);
    }

    private void logStartupDiagnostics(boolean loaded, File dataDir) {
        log.info("========================================================");
        log.info(" ONCF GTFS Train Provider Diagnostics");
        log.info("========================================================");
        log.info(" ONCF GTFS configured: {}", properties.isEnabled() ? "YES" : "NO");
        log.info(" Dataset loaded:       {}", loaded ? "YES" : "NO");
        log.info(" Source:               {}", properties.getSource());
        log.info(" Data directory:       {}", dataDir != null ? dataDir.getAbsolutePath() : properties.getDataPath());
        if (loaded) {
            log.info(" Valid from:           {}", gtfsIndex.getEarliestCalendarDate());
            log.info(" Valid until:          {}", gtfsIndex.getLatestCalendarDate());
            log.info(" Stations:             {}", gtfsIndex.getStations().size());
            log.info(" Routes:               {}", gtfsIndex.getRouteCount());
            log.info(" Trips:                {}", gtfsIndex.getTripCount());
        }
        log.info("========================================================");
    }

    private File resolveDataDirectory(String pathStr) {
        if (pathStr == null || pathStr.isBlank()) {
            return null;
        }
        // Try direct file path
        File file = new File(pathStr);
        if (file.exists() && file.isDirectory()) {
            return file;
        }

        // Try relative to user.dir
        String userDir = System.getProperty("user.dir");
        if (userDir != null) {
            File relative = new File(userDir, pathStr);
            if (relative.exists() && relative.isDirectory()) {
                return relative;
            }
            // In case running from root Yuding directory
            File underTravel = new File(userDir, "backend/travel-service/" + pathStr);
            if (underTravel.exists() && underTravel.isDirectory()) {
                return underTravel;
            }
        }

        return file;
    }

    @Override
    public ProviderMetadata getMetadata() {
        return metadata;
    }

    @Override
    public boolean supports(ProviderCapability capability) {
        return capability == ProviderCapability.TRAINS;
    }

    @Override
    public List<TrainStationDto> getTrainStations() {
        if (!gtfsIndex.isLoaded()) {
            throw TravelProviderException.providerUnavailable(
                    "ONCF_GTFS",
                    "ONCF GTFS dataset is not available. Please run scripts/update-oncf-gtfs.ps1.",
                    null
            );
        }
        return gtfsIndex.getStations();
    }

    @Override
    public List<TrainOfferDto> searchTrains(TrainSearchQuery query) {
        if (!gtfsIndex.isLoaded()) {
            throw TravelProviderException.providerUnavailable(
                    "ONCF_GTFS",
                    "ONCF GTFS dataset is not available. Please run scripts/update-oncf-gtfs.ps1.",
                    null
            );
        }

        return gtfsIndex.searchTrains(
                query.getOriginStation(),
                query.getDestinationStation(),
                query.getDate(),
                query.getDepartureTime(),
                query.getCurrency()
        );
    }

    @Override
    public List<com.ahmed.travelservice.dto.response.FlightOfferDto> searchFlights(com.ahmed.travelservice.domain.query.FlightSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported("ONCF_GTFS", ProviderCapability.FLIGHTS.name());
    }

    @Override
    public List<com.ahmed.travelservice.dto.response.HotelOfferDto> searchHotels(com.ahmed.travelservice.domain.query.HotelSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported("ONCF_GTFS", ProviderCapability.HOTELS.name());
    }

    @Override
    public List<com.ahmed.travelservice.dto.response.ActivityOfferDto> searchActivities(com.ahmed.travelservice.domain.query.ActivitySearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported("ONCF_GTFS", ProviderCapability.ACTIVITIES.name());
    }

    @Override
    public List<com.ahmed.travelservice.dto.response.TransferOfferDto> searchTransfers(com.ahmed.travelservice.domain.query.TransferSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported("ONCF_GTFS", ProviderCapability.TRANSFERS.name());
    }

    @Override
    public com.ahmed.travelservice.dto.response.OfferRevalidationResult revalidateOffer(com.ahmed.travelservice.domain.query.RevalidateOfferQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported("ONCF_GTFS", "REVALIDATE_OFFER");
    }

    public OncfGtfsIndex getGtfsIndex() {
        return gtfsIndex;
    }
}
