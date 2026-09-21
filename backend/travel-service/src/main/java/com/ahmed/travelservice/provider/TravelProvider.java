package com.ahmed.travelservice.provider;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.error.TravelProviderException;

import java.util.List;

/**
 * Provider-neutral abstraction for external travel domain providers.
 * Decouples controllers, services, and domain models from third-party vendor APIs (Amadeus, Duffel, etc.).
 */
public interface TravelProvider {

    /**
     * Returns provider metadata including code, display name, and supported capabilities.
     */
    ProviderMetadata getMetadata();

    /**
     * Checks if this provider supports a specific capability.
     */
    default boolean supports(ProviderCapability capability) {
        return getMetadata() != null && getMetadata().supports(capability);
    }

    /**
     * Search flight offers from this provider using normalized domain query.
     */
    List<FlightOfferDto> searchFlights(FlightSearchQuery query) throws TravelProviderException;

    /**
     * Search hotel / accommodation offers from this provider using normalized domain query.
     */
    List<HotelOfferDto> searchHotels(HotelSearchQuery query) throws TravelProviderException;

    /**
     * Search activity / excursion offers from this provider using normalized domain query.
     */
    List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) throws TravelProviderException;

    /**
     * Search transfer offers from this provider using normalized domain query.
     */
    List<TransferOfferDto> searchTransfers(TransferSearchQuery query) throws TravelProviderException;

    /**
     * Search train schedule offers from this provider using normalized domain query.
     */
    default List<TrainOfferDto> searchTrains(TrainSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(
                getMetadata() != null ? getMetadata().getProviderCode() : "UNKNOWN",
                ProviderCapability.TRAINS.name()
        );
    }

    /**
     * Get available train stations supported by this provider for search and autocomplete.
     */
    default List<TrainStationDto> getTrainStations() throws TravelProviderException {
        return List.of();
    }

    /**
     * Revalidates an offer's availability and real-time price prior to checkout.
     */
    OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) throws TravelProviderException;
}
