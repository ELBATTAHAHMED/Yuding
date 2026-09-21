package com.ahmed.travelservice.service;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.request.ActivitySearchRequest;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.HotelSearchRequest;
import com.ahmed.travelservice.dto.request.RevalidateOfferRequest;
import com.ahmed.travelservice.dto.request.TransferSearchRequest;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.TravelProduct;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class TravelSearchService {

    private static final Logger log = LoggerFactory.getLogger(TravelSearchService.class);

    private final TravelProviderRegistry providerRegistry;
    private final TrainRoutingService trainRoutingService;
    private final CurrencyService currencyService;

    @org.springframework.beans.factory.annotation.Autowired
    public TravelSearchService(TravelProviderRegistry providerRegistry, TrainRoutingService trainRoutingService, CurrencyService currencyService) {
        this.providerRegistry = providerRegistry;
        this.trainRoutingService = trainRoutingService;
        this.currencyService = currencyService;
    }

    public TravelSearchService(TravelProviderRegistry providerRegistry, TrainRoutingService trainRoutingService) { this(providerRegistry, trainRoutingService, null); }

    public TravelSearchService(TravelProviderRegistry providerRegistry) {
        this(providerRegistry, null, null);
    }

    public SearchResponse<FlightOfferDto> searchFlights(FlightSearchRequest request) {
        FlightSearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Flight search initiated [searchId={}]: {} -> {}, date={}, pax={}",
                searchId, query.getOrigin(), query.getDestination(), query.getDepartureDate(), query.getTotalPassengers());

        try {
            TravelProvider provider = providerRegistry.getProviderForProduct(TravelProduct.FLIGHTS);
            List<FlightOfferDto> offers = provider.searchFlights(query);
            applyFlightConversions(offers);
            return SearchResponse.success(searchId, offers);
        } catch (TravelProviderException e) {
            if (isCleanUnavailable(e)) {
                log.info("TravelSearch: Flight provider unavailable [searchId={}]: {}", searchId, e.getMessage());
                return SearchResponse.providerUnavailable(searchId, e.getMessage());
            }
            throw e;
        }
    }

    public SearchResponse<HotelOfferDto> searchHotels(HotelSearchRequest request) {
        HotelSearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Hotel search initiated [searchId={}]: destination={}, checkIn={}, checkOut={}, rooms={}, guests={}",
                searchId, query.getDestination(), query.getCheckIn(), query.getCheckOut(), query.getRooms(), query.getTotalGuests());

        try {
            TravelProvider provider = providerRegistry.getProviderForProduct(TravelProduct.HOTELS);
            List<HotelOfferDto> offers = provider.searchHotels(query);
            applyHotelConversions(offers);
            return SearchResponse.success(searchId, offers);
        } catch (TravelProviderException e) {
            if (isCleanUnavailable(e)) {
                log.info("TravelSearch: Hotel provider unavailable [searchId={}]: {}", searchId, e.getMessage());
                return SearchResponse.providerUnavailable(searchId, e.getMessage());
            }
            throw e;
        }
    }

    public SearchResponse<ActivityOfferDto> searchActivities(ActivitySearchRequest request) {
        ActivitySearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Activity search initiated [searchId={}]: destination={}, category={}, travelers={}, radius={}km",
                searchId, query.getDestination(), query.getCategory(), query.getTravelers(), query.getRadiusKm());

        try {
            TravelProvider provider = providerRegistry.getProviderForProduct(TravelProduct.ACTIVITIES);
            List<ActivityOfferDto> offers = provider.searchActivities(query);
            applyActivityConversions(offers);
            return SearchResponse.success(searchId, offers);
        } catch (TravelProviderException e) {
            if (isCleanUnavailable(e)) {
                log.info("TravelSearch: Activity provider unavailable [searchId={}]: {}", searchId, e.getMessage());
                return SearchResponse.providerUnavailable(searchId, e.getMessage());
            }
            throw e;
        }
    }

    public SearchResponse<TransferOfferDto> searchTransfers(TransferSearchRequest request) {
        TransferSearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Transfer search initiated [searchId={}]: {} -> {}, date={}, time={}, type={}, pax={}",
                searchId, query.getPickup(), query.getDropoff(), query.getDate(), query.getTime(), query.getTransferType(), query.getPassengers());

        try {
            TravelProvider provider = providerRegistry.getProviderForProduct(TravelProduct.TRANSFERS);
            List<TransferOfferDto> offers = provider.searchTransfers(query);
            applyTransferConversions(offers);
            return SearchResponse.success(searchId, offers);
        } catch (TravelProviderException e) {
            if (isCleanUnavailable(e)) {
                log.info("TravelSearch: Transfer provider unavailable [searchId={}]: {}", searchId, e.getMessage());
                return SearchResponse.providerUnavailable(searchId, e.getMessage());
            }
            throw e;
        }
    }

    public SearchResponse<TrainOfferDto> searchTrains(com.ahmed.travelservice.dto.request.TrainSearchRequest request) {
        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation(request.getOriginStation())
                .destinationStation(request.getDestinationStation())
                .date(request.getDate())
                .departureTime(request.getDepartureTime())
                .currency(request.getCurrency())
                .originCoordinates(request.getOriginCoordinates())
                .destinationCoordinates(request.getDestinationCoordinates())
                .originCountryCode(request.getOriginCountryCode())
                .destinationCountryCode(request.getDestinationCountryCode())
                .build();

        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Train search initiated [searchId={}]: {} -> {}, date={}, time={}",
                searchId, query.getOriginStation(), query.getDestinationStation(), query.getDate(), query.getDepartureTime());

        try {
            List<TrainOfferDto> offers = (trainRoutingService != null)
                    ? trainRoutingService.searchTrains(query)
                    : providerRegistry.getProviderForProduct(TravelProduct.TRAINS).searchTrains(query);
            return SearchResponse.success(searchId, offers);
        } catch (TravelProviderException e) {
            if (isCleanUnavailable(e)) {
                log.info("TravelSearch: Train provider unavailable [searchId={}]: {}", searchId, e.getMessage());
                return SearchResponse.providerUnavailable(searchId, e.getMessage());
            }
            throw e;
        }
    }

    public List<TrainStationDto> getTrainStations(String query) {
        try {
            if (trainRoutingService != null) {
                return trainRoutingService.searchStations(query);
            }
            return providerRegistry.getProviderForProduct(TravelProduct.TRAINS).getTrainStations();
        } catch (Exception e) {
            log.warn("TravelSearch: Failed to load train stations: {}", e.getMessage());
            return List.of();
        }
    }

    public List<TrainStationDto> getTrainStations() {
        return getTrainStations(null);
    }

    public OfferRevalidationResult revalidateOffer(RevalidateOfferRequest request) {
        log.info("TravelSearch: Revalidating offer [offerId={}, product={}, provider={}]",
                request.getOfferId(), request.getProductType(), request.getProvider());

        RevalidateOfferQuery query = RevalidateOfferQuery.builder()
                .offerId(request.getOfferId())
                .provider(request.getProvider())
                .productType(request.getProductType())
                .originalPrice(request.getOriginalPrice())
                .currency(request.getCurrency())
                .build();

        try {
            TravelProvider provider = (request.getProvider() != null && !request.getProvider().isBlank())
                    ? providerRegistry.getProvider(request.getProvider())
                    : providerRegistry.getProviderForProduct(request.getProductType());

            return provider.revalidateOffer(query);
        } catch (TravelProviderException e) {
            if (isCleanUnavailable(e)) {
                log.info("TravelSearch: Revalidation provider unavailable [offerId={}]: {}", request.getOfferId(), e.getMessage());
                return OfferRevalidationResult.unavailable(request.getOfferId(), request.getProvider(), e.getMessage());
            }
            throw e;
        }
    }

    private boolean isCleanUnavailable(TravelProviderException e) {
        return e.getErrorCode() == ProviderErrorCode.PROVIDER_UNAVAILABLE
                || e.getErrorCode() == ProviderErrorCode.PROVIDER_NOT_CONFIGURED
                || e.getErrorCode() == ProviderErrorCode.CAPABILITY_NOT_SUPPORTED;
    }

    private CurrencyService.CurrencyConversionScope conversionScope() { return currencyService == null ? null : currencyService.newRequestScope(); }

    private void applyFlightConversions(List<FlightOfferDto> offers) {
        CurrencyService.CurrencyConversionScope scope = conversionScope();
        if (scope != null) offers.forEach(offer -> offer.setPriceConversion(scope.convertSupplementary(offer.getPrice(), offer.getCurrency())));
    }

    private void applyActivityConversions(List<ActivityOfferDto> offers) {
        CurrencyService.CurrencyConversionScope scope = conversionScope();
        if (scope != null) offers.forEach(offer -> offer.setPriceConversion(scope.convertSupplementary(offer.getPrice(), offer.getCurrency())));
    }

    private void applyTransferConversions(List<TransferOfferDto> offers) {
        CurrencyService.CurrencyConversionScope scope = conversionScope();
        if (scope != null) offers.forEach(offer -> offer.setPriceConversion(scope.convertSupplementary(offer.getPrice(), offer.getCurrency())));
    }

    private void applyHotelConversions(List<HotelOfferDto> offers) {
        CurrencyService.CurrencyConversionScope scope = conversionScope();
        if (scope == null) return;
        offers.forEach(hotel -> {
            hotel.setPriceConversion(scope.convertSupplementary(hotel.getPricePerNight(), hotel.getCurrency()));
            hotel.setTotalPriceConversion(scope.convertSupplementary(hotel.getTotalPrice(), hotel.getCurrency()));
            if (hotel.getRoomOffers() != null) hotel.getRoomOffers().forEach(room -> {
                room.setPriceConversion(scope.convertSupplementary(room.getPrice(), room.getCurrency()));
                room.setPricePerNightConversion(scope.convertSupplementary(room.getPricePerNight(), room.getCurrency()));
            });
        });
    }

    // Cache for airports directory to protect provider and preserve fast response times
    private final java.util.concurrent.atomic.AtomicReference<List<AirportDto>> cachedAirports = new java.util.concurrent.atomic.AtomicReference<>();

    private static final List<AirportDto> ESSENTIAL_AIRPORTS = AirportDirectory.ESSENTIAL_AIRPORTS;

    /**
     * Retrieves normalized list of airports for autocomplete/selection.
     * Caches in memory to avoid repeated external directory lookups.
     */
    public List<AirportDto> getAirports() {
        List<AirportDto> cached = cachedAirports.get();
        if (cached != null && !cached.isEmpty()) {
            return cached;
        }

        java.util.Map<String, AirportDto> airportMap = new java.util.LinkedHashMap<>();

        // Add essential regional airports first
        for (AirportDto a : ESSENTIAL_AIRPORTS) {
            airportMap.put(a.getCode().toUpperCase(java.util.Locale.ROOT), a);
        }

        // Fetch from active flight provider if it supports airport directory
        try {
            TravelProvider provider = providerRegistry.getProviderForProduct(TravelProduct.FLIGHTS);
            if (provider instanceof com.ahmed.travelservice.provider.impl.scrappa.ScrappaTravelProvider scrappa) {
                List<AirportDto> providerAirports = scrappa.getAirports();
                for (AirportDto a : providerAirports) {
                    if (a.getCode() != null) {
                        airportMap.putIfAbsent(a.getCode().toUpperCase(java.util.Locale.ROOT), a);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("TravelSearch: Failed to load provider airports directory: {}. Using baseline airports.", e.getMessage());
        }

        List<AirportDto> result = new java.util.ArrayList<>(airportMap.values());
        result.sort(java.util.Comparator.comparing(AirportDto::getCity, java.util.Comparator.nullsLast(String::compareToIgnoreCase)));
        cachedAirports.set(java.util.Collections.unmodifiableList(result));
        return result;
    }
}
