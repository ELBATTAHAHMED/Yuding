package com.ahmed.travelservice.provider.impl.transitland;

import com.ahmed.travelservice.config.TransitlandProperties;
import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.transitland.dto.TransitlandModels;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Provider-backed Trains implementation using Transitland REST API v2 and ONCF GTFS data.
 * Adheres strictly to:
 * - Mandatory Data Freshness Gate (rejects dates beyond the GTFS calendar validity)
 * - Zero Price Invention (fare price is strictly null when absent)
 * - Explicit provenance and official ONCF external schedule link.
 */
@Component
public class TransitlandTravelProvider implements TravelProvider {

    private static final Logger log = LoggerFactory.getLogger(TransitlandTravelProvider.class);

    public static final String PROVIDER_CODE = "TRANSITLAND";
    public static final String OPERATOR_NAME = "ONCF (Office National des Chemins de Fer)";
    public static final String DATA_SOURCE_PROVENANCE = "TRANSITLAND_ONCF_GTFS";
    public static final String OFFICIAL_SCHEDULE_URL = "https://www.oncf-voyages.ma";

    private final TransitlandClient client;
    private final TransitlandProperties properties;
    private final ProviderMetadata metadata;

    // Small local cache for feed stations to minimize Transitland API calls
    private final Map<String, List<TrainStationDto>> stationCache = new ConcurrentHashMap<>();

    @Autowired
    public TransitlandTravelProvider(TransitlandClient client, TransitlandProperties properties) {
        this.client = client;
        this.properties = properties;
        this.metadata = ProviderMetadata.builder()
                .providerCode(PROVIDER_CODE)
                .displayName("Transitland (ONCF GTFS Data)")
                .supportedCapabilities(Set.of(ProviderCapability.TRAINS))
                .build();
    }

    @Override
    public ProviderMetadata getMetadata() {
        return metadata;
    }

    @Override
    public List<FlightOfferDto> searchFlights(FlightSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(PROVIDER_CODE, ProviderCapability.FLIGHTS.name());
    }

    @Override
    public List<HotelOfferDto> searchHotels(HotelSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(PROVIDER_CODE, ProviderCapability.HOTELS.name());
    }

    @Override
    public List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(PROVIDER_CODE, ProviderCapability.ACTIVITIES.name());
    }

    @Override
    public List<TransferOfferDto> searchTransfers(TransferSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(PROVIDER_CODE, ProviderCapability.TRANSFERS.name());
    }

    @Override
    public OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(PROVIDER_CODE, ProviderCapability.REVALIDATION.name());
    }

    @Override
    public List<TrainStationDto> getTrainStations() throws TravelProviderException {
        String feedId = properties.getOncfFeedId();
        List<TrainStationDto> cached = stationCache.get(feedId);
        if (cached != null && !cached.isEmpty()) {
            return cached;
        }

        List<TransitlandModels.StopItem> stops = client.getStops(feedId);
        List<TrainStationDto> stationDtos = new ArrayList<>();
        Set<String> seenNames = new HashSet<>();

        for (TransitlandModels.StopItem stop : stops) {
            String name = cleanStationName(stop.getStopName());
            if (name == null || name.isBlank()) continue;

            String normKey = normalizeForComparison(name);
            if (seenNames.contains(normKey)) continue;
            seenNames.add(normKey);

            Double lat = null;
            Double lon = null;
            if (stop.getGeometry() != null && stop.getGeometry().getCoordinates() != null && stop.getGeometry().getCoordinates().size() >= 2) {
                lon = stop.getGeometry().getCoordinates().get(0);
                lat = stop.getGeometry().getCoordinates().get(1);
            }

            stationDtos.add(TrainStationDto.builder()
                    .id(stop.getStopId() != null && !stop.getStopId().isBlank() ? stop.getStopId() : stop.getOnestopId())
                    .onestopId(stop.getOnestopId())
                    .name(name)
                    .city(deriveCityFromStation(name))
                    .country("Maroc")
                    .latitude(lat)
                    .longitude(lon)
                    .timezone(stop.getStopTimezone())
                    .build());
        }

        stationDtos.sort(Comparator.comparing(TrainStationDto::getName, String.CASE_INSENSITIVE_ORDER));
        if (!stationDtos.isEmpty()) {
            stationCache.put(feedId, Collections.unmodifiableList(stationDtos));
        }
        return stationDtos;
    }

    @Override
    public List<TrainOfferDto> searchTrains(TrainSearchQuery query) throws TravelProviderException {
        if (query == null || query.getOriginStation() == null || query.getDestinationStation() == null || query.getDate() == null) {
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_REQUEST_INVALID, "Origin, destination, and travel date are required");
        }

        String feedId = properties.getOncfFeedId();

        // 1. Mandatory Data Freshness Gate
        TransitlandModels.FeedVersion feedVersion = client.getFeedVersion(feedId);
        String earliestStr = feedVersion != null ? feedVersion.getEarliestCalendarDate() : "2024-01-01";
        String latestStr = feedVersion != null ? feedVersion.getLatestCalendarDate() : "2025-12-31";

        if (latestStr != null && !latestStr.isBlank()) {
            LocalDate latestDate = LocalDate.parse(latestStr);
            if (query.getDate().isAfter(latestDate)) {
                log.warn("Transitland: Requested date {} is outside feed validity [{} to {}]",
                        query.getDate(), earliestStr, latestStr);
                throw TravelProviderException.scheduleDataOutdated(PROVIDER_CODE,
                        "Current timetable data is not available for date " + query.getDate() +
                        ". The underlying GTFS schedule dataset is valid from " + earliestStr + " to " + latestStr +
                        ". Please verify official live schedules on ONCF: " + OFFICIAL_SCHEDULE_URL);
            }
        }

        // 2. Resolve stations
        List<TrainStationDto> stations = getTrainStations();
        TrainStationDto originStation = resolveStation(stations, query.getOriginStation());
        TrainStationDto destStation = resolveStation(stations, query.getDestinationStation());

        if (originStation == null || destStation == null) {
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.OFFER_NOT_FOUND,
                    "One or both requested train stations could not be found in the network schedule");
        }

        if (originStation.getId().equalsIgnoreCase(destStation.getId())) {
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Origin station and destination station cannot be identical");
        }

        // 3. Query departures from origin station
        List<TransitlandModels.DepartureItem> departures = client.getStopDepartures(originStation.getOnestopId(), query.getDate());
        if (departures == null || departures.isEmpty()) {
            return Collections.emptyList();
        }

        List<TrainOfferDto> offers = new ArrayList<>();
        Set<String> seenTrips = new HashSet<>();

        for (TransitlandModels.DepartureItem dept : departures) {
            if (dept.getTrip() == null) continue;
            String tripId = dept.getTrip().getTripId();
            if (tripId == null || tripId.isBlank()) {
                tripId = String.valueOf(dept.getTrip().getId());
            }

            if (seenTrips.contains(tripId)) continue;

            TransitlandModels.RouteSummary route = dept.getTrip().getRoute();
            String routeKey = route != null ? route.getOnestopId() : null;

            TransitlandModels.TripDetail tripDetail = null;
            if (routeKey != null && dept.getTrip().getId() != null) {
                try {
                    tripDetail = client.getTripDetail(routeKey, dept.getTrip().getId());
                } catch (Exception ex) {
                    log.debug("Could not fetch trip detail for tripId {}: {}", tripId, ex.getMessage());
                }
            }

            // Inspect stop times sequence
            TransitlandModels.StopTimeItem originStopTime = null;
            TransitlandModels.StopTimeItem destStopTime = null;
            List<TrainStopDto> intermediateStops = new ArrayList<>();

            if (tripDetail != null && tripDetail.getStopTimes() != null) {
                for (TransitlandModels.StopTimeItem st : tripDetail.getStopTimes()) {
                    if (st.getStop() == null) continue;
                    String sName = cleanStationName(st.getStop().getStopName());
                    String sId = st.getStop().getStopId();
                    String sOnestop = st.getStop().getOnestopId();

                    boolean isOrigin = matchesStation(originStation, sName, sId, sOnestop);
                    boolean isDest = matchesStation(destStation, sName, sId, sOnestop);

                    if (isOrigin) {
                        originStopTime = st;
                    } else if (isDest && originStopTime != null) {
                        destStopTime = st;
                    }

                    if (originStopTime != null && destStopTime == null) {
                        intermediateStops.add(TrainStopDto.builder()
                                .stopSequence(st.getStopSequence() != null ? st.getStopSequence() : 0)
                                .stationId(sId != null ? sId : sOnestop)
                                .stationName(sName)
                                .arrivalTime(st.getArrivalTime())
                                .departureTime(st.getDepartureTime())
                                .build());
                    }
                }
            } else {
                // Fallback from departure headsign if trip details could not be expanded
                String headsign = dept.getTrip().getTripHeadsign();
                if (headsign != null && matchesStation(destStation, headsign, null, null)) {
                    // Origin to headsign terminal match
                    String depTime = dept.getDepartureTime();
                    LocalTime depLocal = parseTimeSafe(depTime);
                    if (query.getDepartureTime() != null && depLocal != null && depLocal.isBefore(query.getDepartureTime())) {
                        continue;
                    }

                    seenTrips.add(tripId);
                    offers.add(buildOffer(
                            tripId,
                            route,
                            originStation,
                            destStation,
                            query.getDate().toString(),
                            depTime,
                            null,
                            null,
                            Collections.emptyList(),
                            earliestStr,
                            latestStr
                    ));
                    continue;
                }
            }

            // If we found a valid origin -> dest stop sequence
            if (originStopTime != null && destStopTime != null) {
                String depTime = originStopTime.getDepartureTime() != null ? originStopTime.getDepartureTime() : dept.getDepartureTime();
                String arrTime = destStopTime.getArrivalTime();

                LocalTime depLocal = parseTimeSafe(depTime);
                if (query.getDepartureTime() != null && depLocal != null && depLocal.isBefore(query.getDepartureTime())) {
                    continue;
                }

                LocalTime arrLocal = parseTimeSafe(arrTime);
                Integer durationMin = null;
                if (depLocal != null && arrLocal != null) {
                    long minutes = Duration.between(depLocal, arrLocal).toMinutes();
                    if (minutes < 0) {
                        minutes += 24 * 60; // Cross-midnight
                    }
                    durationMin = (int) minutes;
                }

                seenTrips.add(tripId);
                offers.add(buildOffer(
                        tripId,
                        route,
                        originStation,
                        destStation,
                        query.getDate().toString(),
                        depTime,
                        arrTime,
                        durationMin,
                        intermediateStops,
                        earliestStr,
                        latestStr
                ));
            }
        }

        offers.sort(Comparator.comparing(o -> parseTimeSafe(o.getDepartureTime()), Comparator.nullsLast(Comparator.naturalOrder())));
        return offers;
    }

    private TrainOfferDto buildOffer(
            String tripId,
            TransitlandModels.RouteSummary route,
            TrainStationDto origin,
            TrainStationDto dest,
            String departureDate,
            String departureTime,
            String arrivalTime,
            Integer durationMinutes,
            List<TrainStopDto> intermediateStops,
            String validityStart,
            String validityEnd
    ) {
        String routeName = route != null ? route.getRouteLongName() : "ONCF Rail";
        String productType = deriveProductType(route, tripId);

        return TrainOfferDto.builder()
                .offerId("train-" + tripId + "-" + departureDate)
                .provider(PROVIDER_CODE)
                .source(DATA_SOURCE_PROVENANCE)
                .operator(OPERATOR_NAME)
                .trainNumber(tripId)
                .routeName(routeName)
                .productType(productType)
                .originStation(origin.getName())
                .originStationId(origin.getId())
                .destinationStation(dest.getName())
                .destinationStationId(dest.getId())
                .departureDate(departureDate)
                .departureTime(departureTime)
                .arrivalTime(arrivalTime)
                .durationMinutes(durationMinutes)
                .direct(true)
                .stopsCount(intermediateStops.size())
                .intermediateStops(intermediateStops)
                .price(null) // STRICTLY NULL - GTFS has no fares
                .currency("MAD")
                .dataFreshness("GTFS timetable calendar coverage: " + validityStart + " to " + validityEnd)
                .feedValidityStart(validityStart)
                .feedValidityEnd(validityEnd)
                .officialScheduleUrl(OFFICIAL_SCHEDULE_URL)
                .build();
    }

    private String deriveProductType(TransitlandModels.RouteSummary route, String tripId) {
        String text = (route != null ? route.getRouteShortName() + " " + route.getRouteLongName() : "") + " " + (tripId != null ? tripId : "");
        String upper = text.toUpperCase(Locale.ROOT);
        if (upper.contains("BORAQ") || upper.contains("TGV") || upper.contains("HIGH SPEED")) {
            return "Al Boraq";
        }
        if (upper.contains("ATLAS")) {
            return "Al Atlas";
        }
        if (upper.contains("TNR") || upper.contains("NAVETTE")) {
            return "TNR";
        }
        return "Train";
    }

    private TrainStationDto resolveStation(List<TrainStationDto> stations, String query) {
        if (query == null || query.isBlank()) return null;
        String qNorm = normalizeForComparison(query);

        // 1. Match by ID or OnestopId
        for (TrainStationDto s : stations) {
            if (s.getId() != null && s.getId().equalsIgnoreCase(query.trim())) return s;
            if (s.getOnestopId() != null && s.getOnestopId().equalsIgnoreCase(query.trim())) return s;
        }

        // 2. Exact normalized name match
        for (TrainStationDto s : stations) {
            if (normalizeForComparison(s.getName()).equals(qNorm)) return s;
        }

        // 3. Contains match
        for (TrainStationDto s : stations) {
            if (normalizeForComparison(s.getName()).contains(qNorm) || qNorm.contains(normalizeForComparison(s.getName()))) {
                return s;
            }
        }

        return null;
    }

    private boolean matchesStation(TrainStationDto station, String name, String stopId, String onestopId) {
        if (station == null) return false;
        if (stopId != null && stopId.equalsIgnoreCase(station.getId())) return true;
        if (onestopId != null && onestopId.equalsIgnoreCase(station.getOnestopId())) return true;
        if (name != null) {
            String normA = normalizeForComparison(station.getName());
            String normB = normalizeForComparison(cleanStationName(name));
            return normA.equals(normB) || normA.contains(normB) || normB.contains(normA);
        }
        return false;
    }

    private String cleanStationName(String raw) {
        if (raw == null) return "";
        // Clean common UTF-8 encoding artifacts if present in GTFS feed
        return raw.replace("An Sebaǽ", "Aïn Sebaâ")
                .replace("BǸni Mellal", "Béni Mellal")
                .replace("Fs", "Fès")
                .replace("KǸnitra", "Kénitra")
                .replace("SalǸ", "Salé")
                .replace("SalǸ-Tabriquet", "Salé-Tabriquet")
                .trim();
    }

    private String deriveCityFromStation(String stationName) {
        String s = stationName.trim();
        if (s.startsWith("Casa-") || s.startsWith("Casablanca")) return "Casablanca";
        if (s.startsWith("Rabat-") || s.startsWith("Rabat")) return "Rabat";
        if (s.startsWith("Tanger-") || s.startsWith("Tanger")) return "Tanger";
        if (s.startsWith("Salé-") || s.startsWith("Salé")) return "Salé";
        if (s.startsWith("Kénitra-") || s.startsWith("Kénitra")) return "Kénitra";
        if (s.startsWith("Fès")) return "Fès";
        if (s.startsWith("Marrakech")) return "Marrakech";
        if (s.startsWith("Meknès")) return "Meknès";
        return s;
    }

    private String normalizeForComparison(String input) {
        if (input == null) return "";
        String s = Normalizer.normalize(input, Normalizer.Form.NFD);
        return s.replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }

    private LocalTime parseTimeSafe(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) return null;
        try {
            String clean = timeStr.trim();
            if (clean.length() == 8) { // HH:mm:ss
                return LocalTime.parse(clean, DateTimeFormatter.ofPattern("HH:mm:ss"));
            } else if (clean.length() == 5) { // HH:mm
                return LocalTime.parse(clean, DateTimeFormatter.ofPattern("HH:mm"));
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
