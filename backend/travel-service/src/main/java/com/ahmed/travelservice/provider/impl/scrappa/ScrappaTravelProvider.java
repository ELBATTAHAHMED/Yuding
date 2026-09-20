package com.ahmed.travelservice.provider.impl.scrappa;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaFlight;
import com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaFlightResponse;
import com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaLeg;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;

/**
 * TravelProvider implementation backed by the Scrappa Google Flights API.
 *
 * Phase 22 capabilities:
 * - FLIGHTS: one-way and round-trip (outbound stage only; itinerary_complete preserved)
 *
 * Explicitly NOT supported in Phase 22:
 * - HOTELS, ACTIVITIES, TRANSFERS → CAPABILITY_NOT_SUPPORTED
 * - REVALIDATION → CAPABILITY_NOT_SUPPORTED (reserved for Phase 36)
 *
 * Infant mapping decision:
 * Yuding 'infants' → Scrappa 'infants_on_lap'
 * Rationale: Yuding's passenger model does not distinguish seated vs. lap infants.
 * 'infants_on_lap' is the safer and more common default for this ambiguity.
 * 'infants_in_seat' is intentionally omitted from the Scrappa request.
 *
 * Round-trip semantics:
 * When returnDate is present, this provider calls the Scrappa /flights/v2/round-trip endpoint.
 * The first call returns outbound options with itinerary_complete=false and a departure_token per flight.
 * The departure_token is preserved in FlightOfferDto.departureToken for potential second-stage use.
 * This provider does NOT automatically fire second-stage calls to protect credits.
 * Each outbound result clearly marks itineraryComplete=false and priceType="round_trip_starting".
 *
 * Provider registration:
 * Spring bean name "SCRAPPA" — registered automatically by TravelProviderRegistry.
 * Activated when TRAVEL_FLIGHTS_PROVIDER=scrappa (case-insensitive match by registry).
 */
@Component("SCRAPPA")
public class ScrappaTravelProvider implements TravelProvider {

    private static final Logger log = LoggerFactory.getLogger(ScrappaTravelProvider.class);

    private static final ProviderMetadata METADATA = ProviderMetadata.builder()
            .providerCode("SCRAPPA")
            .displayName("Scrappa / Google Flights")
            .supportedCapabilities(Set.of(ProviderCapability.FLIGHTS))
            .build();

    private final ScrappaClient client;

    public ScrappaTravelProvider(ScrappaClient client) {
        this.client = client;
    }

    @Override
    public ProviderMetadata getMetadata() {
        return METADATA;
    }

    // ─── FLIGHTS ──────────────────────────────────────────────────────────────

    @Override
    public List<FlightOfferDto> searchFlights(FlightSearchQuery query) throws TravelProviderException {
        ScrappaFlightResponse response;

        if (query.isRoundTrip()) {
            response = client.searchRoundTrip(query);
        } else {
            response = client.searchOneWay(query);
        }

        List<ScrappaFlight> rawFlights = response.safeFlights();
        if (rawFlights.isEmpty()) {
            log.info("[Scrappa] searchFlights: no results returned by provider");
            return Collections.emptyList();
        }

        List<FlightOfferDto> offers = new ArrayList<>(rawFlights.size());
        for (ScrappaFlight raw : rawFlights) {
            FlightOfferDto offer = normalizeOffer(raw, query);
            offers.add(offer);
        }

        log.info("[Scrappa] searchFlights: normalized {} offers", offers.size());
        return offers;
    }

    // ─── Unsupported capabilities ─────────────────────────────────────────────

    @Override
    public List<HotelOfferDto> searchHotels(HotelSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), "HOTELS");
    }

    @Override
    public List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), "ACTIVITIES");
    }

    @Override
    public List<TransferOfferDto> searchTransfers(TransferSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), "TRANSFERS");
    }

    @Override
    public OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) throws TravelProviderException {
        // Revalidation is reserved for Phase 36. Scrappa does not provide a verified
        // revalidation contract that fits the Yuding architecture at this stage.
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), "REVALIDATION");
    }

    // ─── Normalization ────────────────────────────────────────────────────────

    /**
     * Converts a raw ScrappaFlight into a provider-neutral FlightOfferDto.
     *
     * Normalization rules:
     * - offerId: generated UUID (Yuding reference only, not bookable provider token)
     * - provider: "SCRAPPA"
     * - airlineCode/airlineName/flightNumber: taken from first leg
     * - origin/destination: from query (already IATA-extracted by ScrappaClient)
     * - departureTime/arrivalTime: from first leg's departure/arrival times
     * - price: BigDecimal — never float/double
     * - legs: all available legs from provider
     * - itineraryComplete: false for round-trip outbound, true for one-way
     * - priceType: as returned by provider
     * - departureToken: as returned by provider (opaque, preserve as-is)
     */
    private FlightOfferDto normalizeOffer(ScrappaFlight raw, FlightSearchQuery query) {
        // Determine effective legs list (prefer outbound_legs for round-trip, else legs)
        List<ScrappaLeg> effectiveLegs = resolveEffectiveLegs(raw);

        // Extract primary carrier info from first leg
        ScrappaLeg firstLeg = effectiveLegs.isEmpty() ? null : effectiveLegs.get(0);
        ScrappaLeg lastLeg = effectiveLegs.isEmpty() ? null : effectiveLegs.get(effectiveLegs.size() - 1);

        String airlineCode = firstLeg != null ? firstLeg.getAirlineCode() : null;
        String airlineName = firstLeg != null ? firstLeg.getAirlineName() : null;
        String flightNumber = firstLeg != null ? firstLeg.getFlightNumber() : null;
        String departureTime = firstLeg != null ? firstLeg.getDepartureTime() : null;
        String arrivalTime = lastLeg != null ? lastLeg.getArrivalTime() : null;

        // Determine origin/destination from legs if available, else from query
        String origin = (firstLeg != null && firstLeg.getDepartureAirport() != null)
                ? firstLeg.getDepartureAirport()
                : ScrappaClient.extractIata(query.getOrigin(), "origin");
        String destination = (lastLeg != null && lastLeg.getArrivalAirport() != null)
                ? lastLeg.getArrivalAirport()
                : ScrappaClient.extractIata(query.getDestination(), "destination");

        // Duration and stops
        Integer totalDuration = resolveEffectiveDuration(raw);
        Integer totalStops = resolveEffectiveStops(raw);

        // Price — must be BigDecimal; Scrappa returns as JSON number
        BigDecimal price = raw.getPrice() != null ? raw.getPrice() : BigDecimal.ZERO;
        String currency = raw.getCurrency() != null ? raw.getCurrency()
                : (query.getCurrency() != null ? query.getCurrency() : "EUR");

        // Round-trip itinerary completeness
        boolean isOneWay = !query.isRoundTrip();
        Boolean itineraryComplete = isOneWay ? Boolean.TRUE
                : (raw.getItineraryComplete() != null ? raw.getItineraryComplete() : Boolean.FALSE);

        // Normalize all legs
        List<FlightLegDto> normalizedLegs = normalizeLegList(effectiveLegs);

        // Cabin class
        String cabinClass = ScrappaClient.mapCabinClass(query.getTravelClass());

        return FlightOfferDto.builder()
                .offerId(UUID.randomUUID().toString())
                .provider("SCRAPPA")
                .airlineCode(airlineCode)
                .airlineName(airlineName)
                .flightNumber(flightNumber)
                .origin(origin)
                .destination(destination)
                .departureTime(departureTime)
                .arrivalTime(arrivalTime)
                .cabinClass(cabinClass != null ? cabinClass : "economy")
                .price(price)
                .currency(currency)
                .availableSeats(null) // Scrappa does not return seat availability
                .totalDurationMinutes(totalDuration)
                .stops(totalStops)
                .itineraryComplete(itineraryComplete)
                .priceType(raw.getPriceType())
                .departureToken(raw.getDepartureToken())
                .legs(normalizedLegs)
                .build();
    }

    private List<ScrappaLeg> resolveEffectiveLegs(ScrappaFlight raw) {
        // For round-trip outbound: prefer outbound_legs if populated
        if (raw.getOutboundLegs() != null && !raw.getOutboundLegs().isEmpty()) {
            return raw.getOutboundLegs();
        }
        // Fallback to legs for one-way
        if (raw.getLegs() != null && !raw.getLegs().isEmpty()) {
            return raw.getLegs();
        }
        return Collections.emptyList();
    }

    private Integer resolveEffectiveDuration(ScrappaFlight raw) {
        if (raw.getTotalDurationMinutes() != null) return raw.getTotalDurationMinutes();
        if (raw.getOutboundDurationMinutes() != null) return raw.getOutboundDurationMinutes();
        return null;
    }

    private Integer resolveEffectiveStops(ScrappaFlight raw) {
        if (raw.getStops() != null) return raw.getStops();
        if (raw.getOutboundStops() != null) return raw.getOutboundStops();
        return null;
    }

    private List<FlightLegDto> normalizeLegList(List<ScrappaLeg> scrappLegs) {
        if (scrappLegs == null || scrappLegs.isEmpty()) return Collections.emptyList();

        List<FlightLegDto> result = new ArrayList<>(scrappLegs.size());
        for (ScrappaLeg leg : scrappLegs) {
            result.add(FlightLegDto.builder()
                    .departureAirport(leg.getDepartureAirport())
                    .arrivalAirport(leg.getArrivalAirport())
                    .departureTime(leg.getDepartureTime())
                    .arrivalTime(leg.getArrivalTime())
                    .airlineCode(leg.getAirlineCode())
                    .airlineName(leg.getAirlineName())
                    .flightNumber(leg.getFlightNumber())
                    .durationMinutes(leg.getDurationMinutes())
                    .stops(leg.getStops())
                    .aircraft(leg.getAircraft())
                    .build());
        }
        return result;
    }
}
