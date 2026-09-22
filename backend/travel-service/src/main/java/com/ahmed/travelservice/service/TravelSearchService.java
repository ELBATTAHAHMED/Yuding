package com.ahmed.travelservice.service;

import com.ahmed.travelservice.cache.OfferSelectionCache;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class TravelSearchService {

    private static final Logger log = LoggerFactory.getLogger(TravelSearchService.class);

    private final TravelProviderRegistry providerRegistry;
    private final TrainRoutingService trainRoutingService;
    private final CurrencyService currencyService;
    private final com.ahmed.travelservice.cache.ExternalApiCache cache;
    private final com.ahmed.travelservice.cache.ExternalApiCacheProperties cacheProperties;
    private final OfferSelectionCache selectionCache;

    @org.springframework.beans.factory.annotation.Autowired
    public TravelSearchService(TravelProviderRegistry providerRegistry,
                               TrainRoutingService trainRoutingService,
                               CurrencyService currencyService,
                               com.ahmed.travelservice.cache.ExternalApiCache cache,
                               com.ahmed.travelservice.cache.ExternalApiCacheProperties cacheProperties,
                               @org.springframework.beans.factory.annotation.Autowired(required = false) OfferSelectionCache selectionCache) {
        this.providerRegistry = providerRegistry;
        this.trainRoutingService = trainRoutingService;
        this.currencyService = currencyService;
        this.cache = cache;
        this.cacheProperties = cacheProperties;
        this.selectionCache = selectionCache;
    }

    public TravelSearchService(TravelProviderRegistry providerRegistry,
                               TrainRoutingService trainRoutingService,
                               CurrencyService currencyService,
                               com.ahmed.travelservice.cache.ExternalApiCache cache,
                               com.ahmed.travelservice.cache.ExternalApiCacheProperties cacheProperties) {
        this(providerRegistry, trainRoutingService, currencyService, cache, cacheProperties, null);
    }

    public TravelSearchService(TravelProviderRegistry providerRegistry, TrainRoutingService trainRoutingService, CurrencyService currencyService) {
        this(providerRegistry, trainRoutingService, currencyService, null, null, null);
    }

    public TravelSearchService(TravelProviderRegistry providerRegistry, TrainRoutingService trainRoutingService) {
        this(providerRegistry, trainRoutingService, null, null, null, null);
    }

    public TravelSearchService(TravelProviderRegistry providerRegistry) {
        this(providerRegistry, null, null, null, null, null);
    }

    public SearchResponse<FlightOfferDto> searchFlights(FlightSearchRequest request) {
        FlightSearchQuery query = TravelSearchMapper.toQuery(request);
        String searchId = UUID.randomUUID().toString();
        log.info("TravelSearch: Flight search initiated [searchId={}]: {} -> {}, date={}, pax={}",
                searchId, query.getOrigin(), query.getDestination(), query.getDepartureDate(), query.getTotalPassengers());

        try {
            TravelProvider provider = providerRegistry.getProviderForProduct(TravelProduct.FLIGHTS);
            List<FlightOfferDto> offers;
            if (cache != null && cache.isEnabled()) {
                String providerCode = getProviderCode(provider, "scrappa");
                String key = com.ahmed.travelservice.cache.CacheKeyBuilder.flightSearch(providerCode, cacheProperties.getVersion(), query);
                offers = cache.getOrLoad(key, new com.fasterxml.jackson.core.type.TypeReference<List<FlightOfferDto>>() {},
                        cacheProperties.getTtl().getFlightSearch(),
                        () -> provider.searchFlights(query));
            } else {
                offers = provider.searchFlights(query);
            }
            applyFlightConversions(offers);
            registerFlightOffers(offers);
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
            List<HotelOfferDto> offers;
            if (cache != null && cache.isEnabled()) {
                String providerCode = getProviderCode(provider, "nuitee");
                String key = com.ahmed.travelservice.cache.CacheKeyBuilder.hotelSearch(providerCode, cacheProperties.getVersion(), query);
                offers = cache.getOrLoad(key, new com.fasterxml.jackson.core.type.TypeReference<List<HotelOfferDto>>() {},
                        cacheProperties.getTtl().getHotelSearch(),
                        () -> provider.searchHotels(query));
            } else {
                offers = provider.searchHotels(query);
            }
            applyHotelConversions(offers);
            registerHotelOffers(offers);
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
            List<ActivityOfferDto> offers;
            if (cache != null && cache.isEnabled()) {
                String providerCode = getProviderCode(provider, "hbx");
                String key = com.ahmed.travelservice.cache.CacheKeyBuilder.activitySearch(providerCode, cacheProperties.getVersion(), query);
                offers = cache.getOrLoad(key, new com.fasterxml.jackson.core.type.TypeReference<List<ActivityOfferDto>>() {},
                        cacheProperties.getTtl().getActivitySearch(),
                        () -> provider.searchActivities(query));
            } else {
                offers = provider.searchActivities(query);
            }
            applyActivityConversions(offers);
            registerActivityOffers(offers);
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
            List<TransferOfferDto> offers;
            if (cache != null && cache.isEnabled()) {
                String providerCode = getProviderCode(provider, "hbx");
                String key = com.ahmed.travelservice.cache.CacheKeyBuilder.transferSearch(providerCode, cacheProperties.getVersion(), query);
                offers = cache.getOrLoad(key, new com.fasterxml.jackson.core.type.TypeReference<List<TransferOfferDto>>() {},
                        cacheProperties.getTtl().getTransferSearch(),
                        () -> provider.searchTransfers(query));
            } else {
                offers = provider.searchTransfers(query);
            }
            applyTransferConversions(offers);
            registerTransferOffers(offers);
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
            List<TrainOfferDto> offers;
            if (cache != null && cache.isEnabled()) {
                String key = com.ahmed.travelservice.cache.CacheKeyBuilder.trainSearch("trains", cacheProperties.getVersion(), query);
                offers = cache.getOrLoad(key, new com.fasterxml.jackson.core.type.TypeReference<List<TrainOfferDto>>() {},
                        cacheProperties.getTtl().getTrainSearch(),
                        () -> (trainRoutingService != null)
                                ? trainRoutingService.searchTrains(query)
                                : providerRegistry.getProviderForProduct(TravelProduct.TRAINS).searchTrains(query));
            } else {
                offers = (trainRoutingService != null)
                        ? trainRoutingService.searchTrains(query)
                        : providerRegistry.getProviderForProduct(TravelProduct.TRAINS).searchTrains(query);
            }
            registerTrainOffers(offers);
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

    /**
     * Resolves a trusted discovery offer by its opaque selection reference.
     */
    public Optional<ResolvedOfferDto> resolveOfferSelection(String selectionRef) {
        if (selectionCache == null || selectionRef == null) {
            return Optional.empty();
        }
        return selectionCache.get(selectionRef);
    }

    // ─── OFFER SELECTION REGISTRATION ─────────────────────────────────────────

    public void registerFlightOffers(List<FlightOfferDto> offers) {
        if (offers == null || offers.isEmpty()) return;
        for (FlightOfferDto offer : offers) {
            String ref = offer.getSelectionRef();
            if (ref == null || ref.isBlank()) {
                ref = "sel-" + UUID.randomUUID();
                offer.setSelectionRef(ref);
            }
            if (selectionCache != null) {
                Map<String, Object> details = new LinkedHashMap<>();
                details.put("origin", offer.getOrigin());
                details.put("destination", offer.getDestination());
                details.put("departureTime", offer.getDepartureTime());
                details.put("arrivalTime", offer.getArrivalTime());
                details.put("airlineCode", offer.getAirlineCode());
                details.put("airlineName", offer.getAirlineName());
                details.put("flightNumber", offer.getFlightNumber());
                details.put("cabinClass", offer.getCabinClass());
                details.put("stops", offer.getStops());
                details.put("totalDurationMinutes", offer.getTotalDurationMinutes());
                details.put("itineraryComplete", offer.getItineraryComplete());
                details.put("priceType", offer.getPriceType());
                details.put("availableSeats", offer.getAvailableSeats());
                details.put("legs", offer.getLegs());

                ResolvedOfferDto resolved = buildResolvedDto(
                        ref, "FLIGHT", offer.getProvider(), offer.getOfferId(),
                        details, offer.getPrice(), offer.getCurrency(), offer.getPriceConversion(), null);
                selectionCache.put(ref, resolved);
            }
        }
    }

    public void registerHotelOffers(List<HotelOfferDto> offers) {
        if (offers == null || offers.isEmpty()) return;
        for (HotelOfferDto hotel : offers) {
            String ref = hotel.getSelectionRef();
            if (ref == null || ref.isBlank()) {
                ref = "sel-" + UUID.randomUUID();
                hotel.setSelectionRef(ref);
            }
            if (selectionCache != null) {
                Map<String, Object> details = new LinkedHashMap<>();
                details.put("hotelId", hotel.getHotelId());
                details.put("hotelName", hotel.getHotelName());
                details.put("destination", hotel.getDestination());
                details.put("address", hotel.getAddress());
                details.put("city", hotel.getCity());
                details.put("country", hotel.getCountry());
                details.put("propertyType", hotel.getPropertyType());
                details.put("accommodationType", hotel.getAccommodationType());
                details.put("roomSummary", hotel.getRoomSummary());
                details.put("checkIn", hotel.getCheckIn() != null ? hotel.getCheckIn().toString() : null);
                details.put("checkOut", hotel.getCheckOut() != null ? hotel.getCheckOut().toString() : null);
                details.put("starRating", hotel.getStarRating());
                details.put("reviewScore", hotel.getReviewScore());
                details.put("reviewCount", hotel.getReviewCount());
                details.put("availabilityState", hotel.getAvailabilityState());
                details.put("roomOffers", hotel.getRoomOffers());

                var conv = hotel.getTotalPriceConversion() != null ? hotel.getTotalPriceConversion() : hotel.getPriceConversion();
                var amount = hotel.getTotalPrice() != null ? hotel.getTotalPrice() : hotel.getPricePerNight();

                ResolvedOfferDto resolved = buildResolvedDto(
                        ref, "HOTEL", hotel.getProvider(), hotel.getOfferId() != null ? hotel.getOfferId() : hotel.getHotelId(),
                        details, amount, hotel.getCurrency(), conv, null);
                selectionCache.put(ref, resolved);

                // Register room offers if present
                if (hotel.getRoomOffers() != null) {
                    for (HotelRoomOfferDto room : hotel.getRoomOffers()) {
                        String roomRef = room.getSelectionRef();
                        if (roomRef == null || roomRef.isBlank()) {
                            roomRef = "sel-room-" + UUID.randomUUID();
                            room.setSelectionRef(roomRef);
                        }
                        Map<String, Object> roomDetails = new LinkedHashMap<>(details);
                        roomDetails.put("selectedRoom", Map.of(
                                "roomName", room.getRoomName() != null ? room.getRoomName() : "",
                                "rateId", room.getRateId() != null ? room.getRateId() : "",
                                "boardType", room.getBoardType() != null ? room.getBoardType() : "",
                                "cancellationSummary", room.getCancellationSummary() != null ? room.getCancellationSummary() : "",
                                "maxOccupancy", room.getMaxOccupancy() != null ? room.getMaxOccupancy() : 0
                        ));
                        var roomConv = room.getPriceConversion();
                        ResolvedOfferDto roomResolved = buildResolvedDto(
                                roomRef, "HOTEL", hotel.getProvider(), room.getOfferId(),
                                roomDetails, room.getPrice(), room.getCurrency(), roomConv, null);
                        selectionCache.put(roomRef, roomResolved);
                    }
                }
            }
        }
    }

    public void registerActivityOffers(List<ActivityOfferDto> offers) {
        if (offers == null || offers.isEmpty()) return;
        for (ActivityOfferDto activity : offers) {
            String ref = activity.getSelectionRef();
            if (ref == null || ref.isBlank()) {
                ref = "sel-" + UUID.randomUUID();
                activity.setSelectionRef(ref);
            }
            if (selectionCache != null) {
                Map<String, Object> details = new LinkedHashMap<>();
                details.put("title", activity.getTitle());
                details.put("destination", activity.getDestination());
                details.put("date", activity.getDate() != null ? activity.getDate().toString() : null);
                details.put("durationHours", activity.getDurationHours());
                details.put("category", activity.getCategory());
                details.put("description", activity.getDescription());
                details.put("country", activity.getCountry());
                details.put("source", activity.getSource());

                ResolvedOfferDto resolved = buildResolvedDto(
                        ref, "ACTIVITY", activity.getProvider(), activity.getOfferId(),
                        details, activity.getPrice(), activity.getCurrency(), activity.getPriceConversion(), null);
                selectionCache.put(ref, resolved);
            }
        }
    }

    public void registerTransferOffers(List<TransferOfferDto> offers) {
        if (offers == null || offers.isEmpty()) return;
        for (TransferOfferDto transfer : offers) {
            String ref = transfer.getSelectionRef();
            if (ref == null || ref.isBlank()) {
                ref = "sel-" + UUID.randomUUID();
                transfer.setSelectionRef(ref);
            }
            if (selectionCache != null) {
                Map<String, Object> details = new LinkedHashMap<>();
                details.put("pickup", transfer.getPickup());
                details.put("dropoff", transfer.getDropoff());
                details.put("date", transfer.getDate() != null ? transfer.getDate().toString() : null);
                details.put("time", transfer.getTime() != null ? transfer.getTime().toString() : null);
                details.put("transferType", transfer.getTransferType());
                details.put("vehicleModel", transfer.getVehicleModel());
                details.put("capacity", transfer.getCapacity());

                ResolvedOfferDto resolved = buildResolvedDto(
                        ref, "TRANSFER", transfer.getProvider(), transfer.getOfferId(),
                        details, transfer.getPrice(), transfer.getCurrency(), transfer.getPriceConversion(), null);
                selectionCache.put(ref, resolved);
            }
        }
    }

    public void registerTrainOffers(List<TrainOfferDto> offers) {
        if (offers == null || offers.isEmpty()) return;
        for (TrainOfferDto train : offers) {
            String ref = train.getSelectionRef();
            if (ref == null || ref.isBlank()) {
                ref = "sel-" + UUID.randomUUID();
                train.setSelectionRef(ref);
            }
            if (selectionCache != null) {
                Map<String, Object> details = new LinkedHashMap<>();
                details.put("originStation", train.getOriginStation());
                details.put("destinationStation", train.getDestinationStation());
                details.put("originStationId", train.getOriginStationId());
                details.put("destinationStationId", train.getDestinationStationId());
                details.put("departureDate", train.getDepartureDate());
                details.put("departureTime", train.getDepartureTime());
                details.put("arrivalTime", train.getArrivalTime());
                details.put("durationMinutes", train.getDurationMinutes());
                details.put("trainNumber", train.getTrainNumber());
                details.put("routeName", train.getRouteName());
                details.put("operator", train.getOperator());
                details.put("productType", train.getProductType());
                details.put("stopsCount", train.getStopsCount());
                details.put("intermediateStops", train.getIntermediateStops());
                details.put("legs", train.getLegs());

                ResolvedOfferDto resolved = buildResolvedDto(
                        ref, "TRAIN", train.getProvider(), train.getOfferId(),
                        details, train.getPrice(), train.getCurrency(), null, null);
                selectionCache.put(ref, resolved);
            }
        }
    }

    private ResolvedOfferDto buildResolvedDto(String selectionRef,
                                              String productType,
                                              String provider,
                                              String providerOfferId,
                                              Map<String, Object> details,
                                              java.math.BigDecimal amount,
                                              String currency,
                                              PriceConversionSnapshot conv,
                                              Instant providerExpiresAt) {
        return ResolvedOfferDto.builder()
                .selectionRef(selectionRef)
                .productType(productType)
                .provider(provider != null ? provider : "UNKNOWN")
                .providerOfferId(providerOfferId != null ? providerOfferId : selectionRef)
                .selectedDetails(details)
                .providerAmount(amount)
                .providerCurrency(currency)
                .displayAmount(conv != null ? conv.getDisplayAmount() : null)
                .displayCurrency(conv != null ? conv.getDisplayCurrency() : null)
                .exchangeRate(conv != null ? conv.getExchangeRate() : null)
                .exchangeRateDate(conv != null ? conv.getExchangeRateDate() : null)
                .exchangeRateProvider(conv != null ? conv.getExchangeRateProvider() : null)
                .providerExpiresAt(providerExpiresAt)
                .build();
    }

    /**
     * CRITICAL PHASE 30 INVARIANT:
     * Offer revalidation MUST NEVER be cached.
     * Cached search offers are discovery/browsing data only and are strictly non-authoritative.
     * Real price, availability, and booking rules must always be validated live with the provider.
     */
    public OfferRevalidationResult revalidateOffer(RevalidateOfferRequest request) {
        log.info("TravelSearch: Revalidating offer [offerId={}, product={}, provider={}] (live provider call, cache bypassed)",
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

    private String getProviderCode(TravelProvider provider, String defaultCode) {
        if (provider != null && provider.getMetadata() != null && provider.getMetadata().getProviderCode() != null) {
            return provider.getMetadata().getProviderCode();
        }
        return defaultCode;
    }
}
