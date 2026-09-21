package com.ahmed.travelservice.provider.impl;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Default provider-less fallback implementation.
 * Zero external API calls, zero fabricated results, preserves Phase 20 zero-fake-data policy.
 */
@Component("noConfiguredTravelProvider")
public class NoConfiguredTravelProvider implements TravelProvider {

    private static final ProviderMetadata METADATA = ProviderMetadata.none();

    @Override
    public ProviderMetadata getMetadata() {
        return METADATA;
    }

    @Override
    public List<FlightOfferDto> searchFlights(FlightSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.notConfigured(
                METADATA.getProviderCode(),
                "No live flight provider is configured. External flight provider integrations are scheduled for Phase 22+."
        );
    }

    @Override
    public List<HotelOfferDto> searchHotels(HotelSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.notConfigured(
                METADATA.getProviderCode(),
                "No live accommodation provider is configured. External hotel provider integrations are scheduled for Phase 23+."
        );
    }

    @Override
    public List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) throws TravelProviderException {
        throw TravelProviderException.notConfigured(
                METADATA.getProviderCode(),
                "No live activity provider is configured. External activity provider integrations are scheduled for Phase 24+."
        );
    }

    @Override
    public List<TransferOfferDto> searchTransfers(TransferSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.notConfigured(
                METADATA.getProviderCode(),
                "No live transfer provider is configured. External transfer provider integrations are scheduled for Phase 25+."
        );
    }

    @Override
    public List<TrainOfferDto> searchTrains(TrainSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.notConfigured(
                METADATA.getProviderCode(),
                "No live train provider is configured. External train provider integrations are scheduled for Phase 25+."
        );
    }

    @Override
    public OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) throws TravelProviderException {
        throw TravelProviderException.notConfigured(
                METADATA.getProviderCode(),
                "Offer revalidation is unavailable because no live external provider is configured."
        );
    }
}
