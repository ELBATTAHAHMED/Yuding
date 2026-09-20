package com.ahmed.travelservice.service;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.request.ActivitySearchRequest;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.HotelSearchRequest;
import com.ahmed.travelservice.dto.request.TransferSearchRequest;
import com.ahmed.travelservice.dto.response.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class TravelSearchService {

    private static final Logger log = LoggerFactory.getLogger(TravelSearchService.class);

    public SearchResponse<FlightOfferDto> searchFlights(FlightSearchRequest request) {
        FlightSearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Flight search initiated [searchId={}]: {} -> {}, date={}, pax={}",
                searchId, query.getOrigin(), query.getDestination(), query.getDepartureDate(), query.getTotalPassengers());

        return SearchResponse.providerUnavailable(
                searchId,
                "Flight search request validated successfully. External flight providers (Amadeus/Duffel) are scheduled for Phase 21+."
        );
    }

    public SearchResponse<HotelOfferDto> searchHotels(HotelSearchRequest request) {
        HotelSearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Hotel search initiated [searchId={}]: destination={}, checkIn={}, checkOut={}, rooms={}, guests={}",
                searchId, query.getDestination(), query.getCheckIn(), query.getCheckOut(), query.getRooms(), query.getTotalGuests());

        return SearchResponse.providerUnavailable(
                searchId,
                "Hotel search request validated successfully. External accommodation providers are scheduled for Phase 21+."
        );
    }

    public SearchResponse<ActivityOfferDto> searchActivities(ActivitySearchRequest request) {
        ActivitySearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Activity search initiated [searchId={}]: destination={}, category={}, travelers={}, radius={}km",
                searchId, query.getDestination(), query.getCategory(), query.getTravelers(), query.getRadiusKm());

        return SearchResponse.providerUnavailable(
                searchId,
                "Activity search request validated successfully. External activity providers are scheduled for Phase 21+."
        );
    }

    public SearchResponse<TransferOfferDto> searchTransfers(TransferSearchRequest request) {
        TransferSearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Transfer search initiated [searchId={}]: {} -> {}, date={}, time={}, type={}, pax={}",
                searchId, query.getPickup(), query.getDropoff(), query.getDate(), query.getTime(), query.getTransferType(), query.getPassengers());

        return SearchResponse.providerUnavailable(
                searchId,
                "Transfer search request validated successfully. External transfer providers are scheduled for Phase 21+."
        );
    }
}
