package com.ahmed.travelservice.provider.impl.transitous;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.transitous.model.TransitousModels.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Provider implementation for international train and public transport journeys using Transitous (MOTIS v2).
 * Integrates global multimodal schedule routing with rail-first prioritization.
 */
@Component
public class TransitousTrainProvider implements TravelProvider {

    private static final Logger log = LoggerFactory.getLogger(TransitousTrainProvider.class);
    public static final String PROVIDER_CODE = "TRANSITOUS";

    private final TransitousClient client;
    private final ProviderMetadata metadata;

    public TransitousTrainProvider(TransitousClient client) {
        this.client = client;
        this.metadata = ProviderMetadata.builder()
                .providerCode(PROVIDER_CODE)
                .displayName("Transitous (Global Public Transport Routing)")
                .supportedCapabilities(Set.of(ProviderCapability.TRAINS))
                .build();
    }

    @Override
    public ProviderMetadata getMetadata() {
        return metadata;
    }

    @Override
    public List<TrainOfferDto> searchTrains(TrainSearchQuery query) throws TravelProviderException {
        if (query == null || query.getOriginStation() == null || query.getDestinationStation() == null) {
            throw TravelProviderException.badRequest("Origin and destination stations are required");
        }

        log.info("TransitousTrainProvider: Planning journey from '{}' to '{}' on date={}",
                query.getOriginStation(), query.getDestinationStation(), query.getDate());

        // Resolve origin place
        String fromPlace = resolvePlace(query.getOriginStation(), query.getOriginCoordinates());
        if (fromPlace == null) {
            log.warn("TransitousTrainProvider: Could not resolve origin place for '{}'", query.getOriginStation());
            return Collections.emptyList();
        }

        // Resolve destination place
        String toPlace = resolvePlace(query.getDestinationStation(), query.getDestinationCoordinates());
        if (toPlace == null) {
            log.warn("TransitousTrainProvider: Could not resolve destination place for '{}'", query.getDestinationStation());
            return Collections.emptyList();
        }

        // Format ISO-8601 departure datetime
        LocalDate date = query.getDate() != null ? query.getDate() : LocalDate.now();
        LocalTime time = query.getDepartureTime() != null ? query.getDepartureTime() : LocalTime.of(8, 0);
        String isoDateTime = date.atTime(time).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) + "Z";

        // Query Transitous /v6/plan
        PlanResponse response = client.plan(fromPlace, toPlace, isoDateTime, 5,
                "LONG_DISTANCE,HIGHSPEED_RAIL,REGIONAL_RAIL,RAIL,SUBWAY,TRAM");

        if (response == null || response.getItineraries() == null || response.getItineraries().isEmpty()) {
            return Collections.emptyList();
        }

        List<TrainOfferDto> offers = new ArrayList<>();
        for (Itinerary itinerary : response.getItineraries()) {
            TrainOfferDto offer = mapItineraryToOffer(itinerary, query);
            if (offer != null) {
                offers.add(offer);
            }
        }

        return offers;
    }

    /**
     * Resolves a place to coordinates ("lat,lon") or stop ID.
     */
    private String resolvePlace(String stationName, String explicitCoordinates) {
        if (explicitCoordinates != null && explicitCoordinates.contains(",")) {
            return explicitCoordinates.trim();
        }

        // Check if name itself is "lat,lon"
        if (stationName.matches("^-?\\d+(\\.\\d+)?,-?\\d+(\\.\\d+)?$")) {
            return stationName.trim();
        }

        try {
            List<GeocodeResult> geocodeResults = client.geocode(stationName, "fr");
            if (!geocodeResults.isEmpty()) {
                // Prefer STOP over PLACE if available
                GeocodeResult best = geocodeResults.stream()
                        .filter(g -> "STOP".equalsIgnoreCase(g.getType()))
                        .findFirst()
                        .orElse(geocodeResults.get(0));

                if (best.getLat() != null && best.getLon() != null) {
                    return best.getLat() + "," + best.getLon();
                } else if (best.getId() != null) {
                    return best.getId();
                }
            }
        } catch (Exception e) {
            log.warn("TransitousTrainProvider: Geocoding error for '{}': {}", stationName, e.getMessage());
        }

        return null;
    }

    /**
     * Maps a Transitous itinerary to Yuding TrainOfferDto with connection legs and Truth-in-Advertising compliance.
     */
    private TrainOfferDto mapItineraryToOffer(Itinerary itinerary, TrainSearchQuery query) {
        if (itinerary.getLegs() == null || itinerary.getLegs().isEmpty()) {
            return null;
        }

        // Filter: Must contain at least one meaningful rail/transit leg
        List<Leg> transitLegs = itinerary.getLegs().stream()
                .filter(l -> l.getMode() != null && !"WALK".equalsIgnoreCase(l.getMode()))
                .toList();

        if (transitLegs.isEmpty()) {
            return null; // Don't return walk-only itineraries in the train product
        }

        // Find primary rail leg for operator and product labeling
        Leg primaryLeg = transitLegs.stream()
                .max(Comparator.comparingLong(l -> l.getDuration() != null ? l.getDuration() : 0))
                .orElse(transitLegs.get(0));

        String operator = primaryLeg.getAgencyName() != null ? primaryLeg.getAgencyName() : "Public Transport";
        String productType = mapProductType(primaryLeg.getMode(), primaryLeg.getDisplayName());
        String trainNumber = resolveTrainNumber(primaryLeg);
        String officialUrl = primaryLeg.getAgencyUrl() != null && !primaryLeg.getAgencyUrl().isBlank()
                ? primaryLeg.getAgencyUrl()
                : null;

        // Build legs
        List<TrainLegDto> legDtos = new ArrayList<>();
        List<TrainStopDto> allIntermediateStops = new ArrayList<>();
        int stopSeq = 1;

        for (Leg leg : itinerary.getLegs()) {
            TrainLegDto legDto = TrainLegDto.builder()
                    .mode(leg.getMode())
                    .operator(leg.getAgencyName())
                    .serviceName(leg.getDisplayName() != null ? leg.getDisplayName() : leg.getRouteShortName())
                    .origin(leg.getFrom() != null ? leg.getFrom().getName() : null)
                    .destination(leg.getTo() != null ? leg.getTo().getName() : null)
                    .departureTime(formatTime(leg.getStartTime()))
                    .arrivalTime(formatTime(leg.getEndTime()))
                    .durationMinutes(leg.getDuration() != null ? (int) (leg.getDuration() / 60) : null)
                    .realTime(Boolean.TRUE.equals(leg.getRealTime()))
                    .cancelled(Boolean.TRUE.equals(leg.getCancelled()))
                    .build();

            if (leg.getIntermediateStops() != null) {
                List<TrainStopDto> legStops = new ArrayList<>();
                for (StopPlace sp : leg.getIntermediateStops()) {
                    TrainStopDto stopDto = TrainStopDto.builder()
                            .stopSequence(stopSeq++)
                            .stationId(sp.getStopId())
                            .stationName(sp.getName())
                            .arrivalTime(formatTime(sp.getArrival()))
                            .departureTime(formatTime(sp.getDeparture()))
                            .build();
                    legStops.add(stopDto);
                    allIntermediateStops.add(stopDto);
                }
                legDto.setIntermediateStops(legStops);
            }

            legDtos.add(legDto);
        }

        int transfers = itinerary.getTransfers() != null ? itinerary.getTransfers() : Math.max(0, transitLegs.size() - 1);
        boolean isDirect = transfers == 0;
        int durationMinutes = itinerary.getDuration() != null ? (int) (itinerary.getDuration() / 60) : 0;

        String departureDate = formatDate(itinerary.getStartTime(), query.getDate());
        String departureTime = formatTime(itinerary.getStartTime());
        String arrivalTime = formatTime(itinerary.getEndTime());

        String originName = itinerary.getLegs().get(0).getFrom() != null
                ? itinerary.getLegs().get(0).getFrom().getName()
                : query.getOriginStation();
        String destinationName = itinerary.getLegs().get(itinerary.getLegs().size() - 1).getTo() != null
                ? itinerary.getLegs().get(itinerary.getLegs().size() - 1).getTo().getName()
                : query.getDestinationStation();

        return TrainOfferDto.builder()
                .offerId(UUID.randomUUID().toString())
                .provider(PROVIDER_CODE)
                .source(PROVIDER_CODE)
                .operator(operator)
                .trainNumber(trainNumber)
                .routeName(originName + " → " + destinationName)
                .productType(productType)
                .originStation(originName)
                .originStationId(itinerary.getLegs().get(0).getFrom() != null ? itinerary.getLegs().get(0).getFrom().getStopId() : null)
                .destinationStation(destinationName)
                .destinationStationId(itinerary.getLegs().get(itinerary.getLegs().size() - 1).getTo() != null ? itinerary.getLegs().get(itinerary.getLegs().size() - 1).getTo().getStopId() : null)
                .departureDate(departureDate)
                .departureTime(departureTime)
                .arrivalTime(arrivalTime)
                .durationMinutes(durationMinutes)
                .direct(isDirect)
                .numberOfTransfers(transfers)
                .stopsCount(allIntermediateStops.size())
                .intermediateStops(allIntermediateStops)
                .legs(legDtos)
                .price(null) // Strictly null: Truth-in-Advertising
                .currency(query.getCurrency() != null ? query.getCurrency() : "EUR")
                .dataFreshness("Données horaires internationales Transitous (OpenStreetMap / GTFS / NeTEx)")
                .officialScheduleUrl(officialUrl)
                .build();
    }

    private String mapProductType(String mode, String displayName) {
        if (displayName != null && !displayName.isBlank()) {
            if (displayName.toUpperCase(Locale.ROOT).contains("TGV")) return "TGV";
            if (displayName.toUpperCase(Locale.ROOT).contains("ICE")) return "ICE";
            if (displayName.toUpperCase(Locale.ROOT).contains("AVE")) return "AVE";
            if (displayName.toUpperCase(Locale.ROOT).contains("EUROSTAR")) return "Eurostar";
        }
        if (mode == null) return "Train";
        return switch (mode.toUpperCase(Locale.ROOT)) {
            case "HIGHSPEED_RAIL" -> "Train Grande Vitesse";
            case "LONG_DISTANCE" -> "Train Intercités";
            case "REGIONAL_RAIL" -> "Train Régional";
            case "RAIL" -> "Train";
            case "SUBWAY" -> "Métro";
            case "TRAM" -> "Tramway";
            default -> "Train";
        };
    }

    private String resolveTrainNumber(Leg leg) {
        if (leg.getDisplayName() != null && !leg.getDisplayName().isBlank()) return leg.getDisplayName();
        if (leg.getTripShortName() != null && !leg.getTripShortName().isBlank()) return leg.getTripShortName();
        if (leg.getRouteShortName() != null && !leg.getRouteShortName().isBlank()) return leg.getRouteShortName();
        return leg.getMode() != null ? leg.getMode() : "Train";
    }

    private String formatTime(String isoString) {
        if (isoString == null || isoString.isBlank()) return "--:--";
        try {
            OffsetDateTime odt = OffsetDateTime.parse(isoString);
            return odt.format(DateTimeFormatter.ofPattern("HH:mm"));
        } catch (Exception e) {
            if (isoString.length() >= 16 && isoString.contains("T")) {
                return isoString.substring(11, 16);
            }
            return isoString;
        }
    }

    private String formatDate(String isoString, LocalDate fallback) {
        if (isoString == null || isoString.isBlank()) {
            return fallback != null ? fallback.toString() : LocalDate.now().toString();
        }
        try {
            OffsetDateTime odt = OffsetDateTime.parse(isoString);
            return odt.toLocalDate().toString();
        } catch (Exception e) {
            if (isoString.length() >= 10) {
                return isoString.substring(0, 10);
            }
            return fallback != null ? fallback.toString() : LocalDate.now().toString();
        }
    }

    /**
     * Searches train stations and places globally using Transitous geocoding.
     */
    public List<TrainStationDto> searchStations(String query) throws TravelProviderException {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }

        List<GeocodeResult> results = client.geocode(query.trim(), "fr");
        List<TrainStationDto> stations = new ArrayList<>();

        for (GeocodeResult gr : results) {
            String country = null;
            String city = null;

            if (gr.getAreas() != null) {
                for (Area area : gr.getAreas()) {
                    if (area.getAdminLevel() != null && area.getAdminLevel() == 2.0) {
                        country = area.getName();
                    }
                    if (area.getAdminLevel() != null && (area.getAdminLevel() == 8.0 || area.getAdminLevel() == 6.0) && city == null) {
                        city = area.getName();
                    }
                }
            }

            if (country == null) country = gr.getCountry();
            if (city == null) city = gr.getName();

            stations.add(TrainStationDto.builder()
                    .id(gr.getLat() != null && gr.getLon() != null ? gr.getLat() + "," + gr.getLon() : gr.getId())
                    .name(gr.getName())
                    .city(city)
                    .country(country != null ? country : gr.getCountry())
                    .countryCode(gr.getCountry())
                    .provider(PROVIDER_CODE)
                    .locationType(gr.getType())
                    .latitude(gr.getLat())
                    .longitude(gr.getLon())
                    .timezone(gr.getTz())
                    .build());
        }

        return stations;
    }

    @Override
    public List<TrainStationDto> getTrainStations() throws TravelProviderException {
        return Collections.emptyList();
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
        throw TravelProviderException.capabilityNotSupported(PROVIDER_CODE, "REVALIDATE_OFFER");
    }
}
