package com.ahmed.travelservice.provider.impl.nuitee;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.nuitee.dto.*;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.dto.image.ImageRole;
import com.ahmed.travelservice.dto.image.ImageSourceType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * TravelProvider implementation backed by Nuitee Connect (LiteAPI v3).
 *
 * Phase 23 capabilities:
 * - HOTELS: real provider-backed hotel and room offer search.
 *
 * Explicitly NOT supported in Phase 23:
 * - FLIGHTS, ACTIVITIES, TRANSFERS → CAPABILITY_NOT_SUPPORTED
 * - REVALIDATION → CAPABILITY_NOT_SUPPORTED (reserved for Phase 36)
 *
 * Provider registration:
 * Spring bean name "NUITEE" — registered automatically by TravelProviderRegistry.
 * Activated when TRAVEL_HOTELS_PROVIDER=nuitee.
 */
@Component("NUITEE")
public class NuiteeTravelProvider implements TravelProvider {

    private static final Logger log = LoggerFactory.getLogger(NuiteeTravelProvider.class);

    private static final ProviderMetadata METADATA = ProviderMetadata.builder()
            .providerCode("NUITEE")
            .displayName("Nuitee Connect / LiteAPI")
            .supportedCapabilities(Set.of(ProviderCapability.HOTELS))
            .build();

    private final NuiteeClient client;

    public NuiteeTravelProvider(NuiteeClient client) {
        this.client = client;
    }

    @Override
    public ProviderMetadata getMetadata() {
        return METADATA;
    }

    @Override
    public List<FlightOfferDto> searchFlights(FlightSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), ProviderCapability.FLIGHTS.name());
    }

    @Override
    public List<HotelOfferDto> searchHotels(HotelSearchQuery query) throws TravelProviderException {
        validateHotelQuery(query);

        NuiteeRatesRequest ratesRequest = buildRatesRequest(query);
        NuiteeRatesResponse response = client.searchHotelRates(ratesRequest);

        return normalizeHotelOffers(response, query);
    }

    @Override
    public List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), ProviderCapability.ACTIVITIES.name());
    }

    @Override
    public List<TransferOfferDto> searchTransfers(TransferSearchQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), ProviderCapability.TRANSFERS.name());
    }

    @Override
    public OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), "REVALIDATION");
    }

    // ─── Query Validation ────────────────────────────────────────────────────────

    private void validateHotelQuery(HotelSearchQuery query) throws TravelProviderException {
        if (query == null) {
            throw new TravelProviderException(
                    METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "La requête de recherche d'hôtels ne peut pas être vide."
            );
        }

        if (query.getCheckIn() == null || query.getCheckOut() == null) {
            throw new TravelProviderException(
                    METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Les dates d'arrivée et de départ sont obligatoires."
            );
        }

        LocalDate today = LocalDate.now();
        if (query.getCheckIn().isBefore(today)) {
            throw new TravelProviderException(
                    METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "La date d'arrivée ne peut pas être dans le passé."
            );
        }

        if (!query.getCheckOut().isAfter(query.getCheckIn())) {
            throw new TravelProviderException(
                    METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "La date de départ doit être strictement postérieure à la date d'arrivée."
            );
        }

        String dest = query.getDestination();
        String city = query.getCity();
        if ((dest == null || dest.isBlank()) && (city == null || city.isBlank())) {
            throw new TravelProviderException(
                    METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "La destination de séjour est obligatoire."
            );
        }
    }

    // ─── Request Mapping ─────────────────────────────────────────────────────────

    private NuiteeRatesRequest buildRatesRequest(HotelSearchQuery query) {
        String rawCity = query.getCity() != null && !query.getCity().isBlank() ? query.getCity() : query.getDestination();
        String city = com.ahmed.travelservice.service.AirportDirectory.normalizeCityName(rawCity);
        String countryCode = query.getCountryCode() != null && !query.getCountryCode().isBlank() ? query.getCountryCode() : "MA";

        List<HotelSearchQuery.RoomOccupancy> domainOccupancies = query.getOccupanciesOrDefault();
        List<NuiteeOccupancy> nuiteeOccupancies = domainOccupancies.stream()
                .map(o -> NuiteeOccupancy.builder()
                        .adults(Math.max(1, o.getAdults()))
                        .children(o.getChildrenAges() != null && !o.getChildrenAges().isEmpty() ? o.getChildrenAges() : Collections.emptyList())
                        .rooms(1)
                        .build())
                .toList();

        return NuiteeRatesRequest.builder()
                .checkin(query.getCheckIn().toString())
                .checkout(query.getCheckOut().toString())
                .currency(query.getCurrency() != null ? query.getCurrency().toUpperCase() : "EUR")
                .guestNationality(query.getGuestNationality() != null ? query.getGuestNationality().toUpperCase() : "MA")
                .occupancies(nuiteeOccupancies)
                .cityName(city)
                .countryCode(countryCode)
                .limit(20)
                .timeout(10)
                .includeHotelData(true)
                .build();
    }

    // ─── Response Normalization ──────────────────────────────────────────────────

    private List<HotelOfferDto> normalizeHotelOffers(NuiteeRatesResponse response, HotelSearchQuery query) {
        if (response == null || response.getData() == null || response.getData().isEmpty()) {
            log.info("NuiteeTravelProvider: No hotel rates returned for destination '{}'", query.getDestination());
            return Collections.emptyList();
        }

        // Index hotel metadata by ID
        Map<String, NuiteeHotelData> hotelMap = new HashMap<>();
        if (response.getHotels() != null) {
            for (NuiteeHotelData h : response.getHotels()) {
                if (h.getId() != null) {
                    hotelMap.put(h.getId(), h);
                }
            }
        }
        Map<String, Integer> hotelTypeIds = client.getHotelTypeIds(hotelMap.keySet());
        if (hotelTypeIds == null) {
            hotelTypeIds = Collections.emptyMap();
        }

        long nights = Math.max(1, query.getNumberOfNights());
        List<HotelOfferDto> hotelOffers = new ArrayList<>();

        for (NuiteeHotelRatesData rateGroup : response.getData()) {
            String hotelId = rateGroup.getHotelId();
            NuiteeHotelData hotelMeta = hotelMap.get(hotelId);

            List<HotelRoomOfferDto> roomOffers = new ArrayList<>();
            BigDecimal minTotalPrice = null;
            String primaryOfferId = null;
            String startingRoomName = null;
            String startingCurrency = query.getCurrency() != null ? query.getCurrency() : "EUR";

            if (rateGroup.getRoomTypes() != null) {
                for (NuiteeRoomType roomType : rateGroup.getRoomTypes()) {
                    String realOfferId = roomType.getOfferId();
                    String roomTypeId = roomType.getRoomTypeId();

                    if (roomType.getRates() != null) {
                        for (NuiteeRate rate : roomType.getRates()) {
                            BigDecimal totalAmount = rate.getRetailRate() != null ? rate.getRetailRate().getTotalAmount() : null;
                            String rateCurrency = rate.getRetailRate() != null && rate.getRetailRate().getTotalCurrency() != null
                                    ? rate.getRetailRate().getTotalCurrency() : startingCurrency;

                            if (totalAmount != null) {
                                startingCurrency = rateCurrency;
                                if (minTotalPrice == null || totalAmount.compareTo(minTotalPrice) < 0) {
                                    minTotalPrice = totalAmount;
                                    primaryOfferId = realOfferId;
                                    startingRoomName = rate.getName();
                                }
                            }

                            BigDecimal pricePerNight = totalAmount != null
                                    ? totalAmount.divide(BigDecimal.valueOf(nights), 2, RoundingMode.HALF_UP)
                                    : null;

                            Boolean refundable = rate.getCancellationPolicies() != null
                                    ? rate.getCancellationPolicies().isRefundable()
                                    : null;

                            String deadline = null;
                            if (rate.getCancellationPolicies() != null && rate.getCancellationPolicies().getCancelPolicyInfos() != null
                                    && !rate.getCancellationPolicies().getCancelPolicyInfos().isEmpty()) {
                                deadline = rate.getCancellationPolicies().getCancelPolicyInfos().get(0).getCancelTime();
                            }

                            String cancelSummary = Boolean.TRUE.equals(refundable)
                                    ? (deadline != null ? "Annulation gratuite jusqu'au " + deadline : "Annulation gratuite")
                                    : "Non remboursable";

                            roomOffers.add(HotelRoomOfferDto.builder()
                                    .offerId(realOfferId)
                                    .rateId(rate.getRateId())
                                    .roomTypeId(roomTypeId)
                                    .roomName(rate.getName() != null ? rate.getName() : "Chambre standard")
                                    .maxOccupancy(rate.getMaxOccupancy())
                                    .adultCount(rate.getAdultCount())
                                    .childCount(rate.getChildCount())
                                    .boardType(rate.getBoardType())
                                    .boardName(rate.getBoardName() != null ? rate.getBoardName() : rate.getBoardType())
                                    .refundable(refundable)
                                    .cancellationDeadline(deadline)
                                    .cancellationSummary(cancelSummary)
                                    .price(totalAmount)
                                    .pricePerNight(pricePerNight)
                                    .currency(rateCurrency)
                                    .build());
                        }
                    }
                }
            }

            if (minTotalPrice == null && !roomOffers.isEmpty() && roomOffers.get(0).getPrice() != null) {
                minTotalPrice = roomOffers.get(0).getPrice();
                primaryOfferId = roomOffers.get(0).getOfferId();
                startingRoomName = roomOffers.get(0).getRoomName();
            }

            BigDecimal startingPricePerNight = minTotalPrice != null
                    ? minTotalPrice.divide(BigDecimal.valueOf(nights), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            String hotelName = hotelMeta != null && hotelMeta.getName() != null ? hotelMeta.getName() : "Hôtel " + hotelId;
            String address = hotelMeta != null ? hotelMeta.getAddress() : null;
            String city = hotelMeta != null && hotelMeta.getCityName() != null ? hotelMeta.getCityName() : query.getCity();
            String country = hotelMeta != null && hotelMeta.getCountryCode() != null ? hotelMeta.getCountryCode() : query.getCountryCode();
            Double starRating = hotelMeta != null ? hotelMeta.getStars() : null;
            Double reviewScore = hotelMeta != null ? hotelMeta.getRating() : null;
            Integer reviewCount = hotelMeta != null ? hotelMeta.getReviewCount() : null;
            String imageUrl = hotelMeta != null && hotelMeta.getMainPhoto() != null ? hotelMeta.getMainPhoto()
                    : (hotelMeta != null ? hotelMeta.getThumbnail() : null);

            ImageAssetDto imageAsset;
            if (imageUrl != null && !imageUrl.isBlank()) {
                imageAsset = ImageAssetDto.builder()
                        .id("nuitee-hotel-" + hotelId)
                        .url(imageUrl)
                        .altText("Photo de l'établissement " + hotelName)
                        .sourceType(ImageSourceType.PROVIDER_ENTITY)
                        .sourceProvider(METADATA.getProviderCode())
                        .sourceAssetId(hotelId)
                        .role(ImageRole.HOTEL)
                        .representsEntity(true)
                        .build();
            } else {
                imageAsset = ImageAssetDto.builder()
                        .id("placeholder-hotel-" + hotelId)
                        .altText("Photo non fournie pour " + hotelName)
                        .sourceType(ImageSourceType.PLACEHOLDER)
                        .sourceProvider("SYSTEM")
                        .role(ImageRole.HOTEL)
                        .representsEntity(false)
                        .build();
            }

            hotelOffers.add(HotelOfferDto.builder()
                    .offerId(primaryOfferId != null ? primaryOfferId : hotelId)
                    .provider(METADATA.getProviderCode())
                    .hotelId(hotelId)
                    .hotelName(hotelName)
                    .destination(query.getDestination())
                    .address(address)
                    .city(city)
                    .country(country)
                    .propertyType(query.getPropertyType() != null ? query.getPropertyType() : "HOTEL")
                    .accommodationType(normalizeAccommodationType(hotelMeta,
                            hotelMeta != null && hotelMeta.getHotelTypeId() != null
                                    ? hotelMeta.getHotelTypeId() : hotelTypeIds.get(hotelId)))
                    .roomSummary(startingRoomName != null ? startingRoomName : "Chambre disponible")
                    .checkIn(query.getCheckIn())
                    .checkOut(query.getCheckOut())
                    .pricePerNight(startingPricePerNight)
                    .totalPrice(minTotalPrice != null ? minTotalPrice : BigDecimal.ZERO)
                    .currency(startingCurrency)
                    .starRating(starRating)
                    .reviewScore(reviewScore)
                    .reviewCount(reviewCount)
                    .imageUrl(imageUrl)
                    .imageAsset(imageAsset)
                    .availabilityState("AVAILABLE_ON_PROVIDER")
                    .roomOffers(roomOffers)
                    .build());
        }

        log.info("NuiteeTravelProvider: Successfully normalized {} hotel offers from Nuitee response", hotelOffers.size());
        return hotelOffers;
    }

    /**
     * Map Nuitee's explicit location_type classification to the provider-neutral
     * categories consumed by the frontend. Unknown classifications remain null;
     * they are never guessed from hotel or room names.
     */
    private String normalizeAccommodationType(NuiteeHotelData hotelMeta, Integer hotelTypeId) {
        String typeFromId = normalizeAccommodationTypeId(hotelTypeId);
        if (typeFromId != null) {
            return typeFromId;
        }
        if (hotelMeta == null || hotelMeta.getLocationType() == null
                || hotelMeta.getLocationType().isBlank()) {
            return null;
        }

        String locationType = hotelMeta.getLocationType().trim().toLowerCase(Locale.ROOT);
        if (locationType.contains("riad")) {
            return "RIAD";
        }
        if (locationType.contains("villa")) {
            return "VILLA";
        }
        if (locationType.contains("apartment") || locationType.contains("aparthotel")) {
            return "APARTMENT";
        }
        if (locationType.contains("house") || locationType.contains("holiday home")
                || locationType.contains("vacation home")) {
            return "HOUSE";
        }
        if (locationType.contains("hotel")) {
            return "HOTEL";
        }
        return null;
    }

    private String normalizeAccommodationTypeId(Integer hotelTypeId) {
        if (hotelTypeId == null) {
            return null;
        }
        return switch (hotelTypeId) {
            case 201, 207, 219, 229 -> "APARTMENT";
            case 213 -> "VILLA";
            case 220, 223, 250, 252 -> "HOUSE";
            case 227 -> "RIAD";
            case 204, 206, 208, 216, 218, 231, 274, 278 -> "HOTEL";
            default -> null;
        };
    }
}
