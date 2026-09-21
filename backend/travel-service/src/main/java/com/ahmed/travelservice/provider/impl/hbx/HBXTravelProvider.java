package com.ahmed.travelservice.provider.impl.hbx;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.hbx.dto.activities.*;
import com.ahmed.travelservice.provider.impl.hbx.dto.transfers.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * TravelProvider implementation backed by the HBX Group / Hotelbeds APITUDE suite.
 *
 * Capabilities:
 * - ACTIVITIES (Phase 24): Provider-backed experiences and excursions.
 * - TRANSFERS (Phase 25): Provider-backed airport and private transport offers.
 *
 * Explicitly NOT supported:
 * - FLIGHTS (backed by Scrappa)
 * - HOTELS (backed by Nuitee Connect)
 * - REVALIDATION (reserved for future phase)
 */
@Component("HBX")
public class HBXTravelProvider implements TravelProvider {

    private static final Logger log = LoggerFactory.getLogger(HBXTravelProvider.class);

    private static final ProviderMetadata METADATA = ProviderMetadata.builder()
            .providerCode("HBX")
            .displayName("HBX Group / Hotelbeds APITUDE")
            .supportedCapabilities(Set.of(ProviderCapability.ACTIVITIES, ProviderCapability.TRANSFERS))
            .build();

    private final HBXActivitiesClient activitiesClient;
    private final HBXTransfersClient transfersClient;

    public HBXTravelProvider(HBXActivitiesClient activitiesClient, HBXTransfersClient transfersClient) {
        this.activitiesClient = activitiesClient;
        this.transfersClient = transfersClient;
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
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), ProviderCapability.HOTELS.name());
    }

    @Override
    public OfferRevalidationResult revalidateOffer(RevalidateOfferQuery query) throws TravelProviderException {
        throw TravelProviderException.capabilityNotSupported(METADATA.getProviderCode(), "REVALIDATION");
    }

    // ─── Activities Implementation (Phase 24) ────────────────────────────────────

    @Override
    public List<ActivityOfferDto> searchActivities(ActivitySearchQuery query) throws TravelProviderException {
        validateActivityQuery(query);

        String destCode = HBXActivitiesClient.resolveDestinationCode(query.getDestination());
        if (destCode == null || destCode.isBlank()) {
            throw new TravelProviderException(METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Destination invalide ou non reconnue: " + query.getDestination());
        }

        LocalDate fromDate = query.getDate() != null ? query.getDate() : LocalDate.now().plusDays(3);
        LocalDate toDate = fromDate.plusDays(4);

        HBXActivitySearchRequest request = HBXActivitySearchRequest.builder()
                .filters(List.of(
                        HBXActivitySearchRequest.FilterGroup.builder()
                                .searchFilterItems(List.of(
                                        HBXActivitySearchRequest.SearchFilterItem.builder()
                                                .type("destination")
                                                .value(destCode)
                                                .build()
                                ))
                                .build()
                ))
                .from(fromDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .to(toDate.format(DateTimeFormatter.ISO_LOCAL_DATE))
                .language("fr")
                .pagination(HBXActivitySearchRequest.Pagination.builder()
                        .page(1)
                        .itemsPerPage(30)
                        .build())
                .build();

        log.info("HBXTravelProvider: Searching activities for destCode={}, date={}", destCode, fromDate);
        HBXActivitySearchResponse response = activitiesClient.searchActivities(request);

        List<ActivityOfferDto> normalized = normalizeActivities(response, query);

        // Fallback policy: only supply curated YUDING_CUSTOM for specifically curated markets (e.g. Marrakech)
        if (normalized.isEmpty() && isCuratedMarket(destCode, query.getDestination())) {
            log.info("HBXTravelProvider: Zero HBX activities for curated market {}; applying YUDING_CUSTOM fallback with explicit provenance", query.getDestination());
            return getCuratedMarrakechOffers(query);
        }

        return normalized;
    }

    private void validateActivityQuery(ActivitySearchQuery query) throws TravelProviderException {
        if (query == null) {
            throw new TravelProviderException(METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "La requête de recherche d'activités ne peut pas être vide.");
        }
        if (query.getDestination() == null || query.getDestination().isBlank()) {
            throw new TravelProviderException(METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "La destination est obligatoire pour rechercher des activités.");
        }
    }

    private List<ActivityOfferDto> normalizeActivities(HBXActivitySearchResponse response, ActivitySearchQuery query) {
        if (response == null || response.getActivities() == null || response.getActivities().isEmpty()) {
            return Collections.emptyList();
        }

        List<ActivityOfferDto> offers = new ArrayList<>();

        for (HBXActivitySearchResponse.HBXActivity act : response.getActivities()) {
            if (act == null || act.getCode() == null || act.getName() == null) {
                continue;
            }

            BigDecimal price = resolveActivityPrice(act);
            Double duration = resolveActivityDuration(act);
            String imageUrl = resolveActivityImage(act);
            String description = resolveActivityDescription(act);
            String category = (act.getType() != null && !act.getType().isBlank()) ? act.getType() : "Excursion";

            ActivityOfferDto dto = ActivityOfferDto.builder()
                    .offerId("HBX-" + act.getCode())
                    .provider("HBX")
                    .source("HBX")
                    .title(act.getName())
                    .destination(query.getDestination() != null ? query.getDestination() : "Global")
                    .country(act.getCountryCode() != null ? act.getCountryCode() : null)
                    .date(query.getDate() != null ? query.getDate() : LocalDate.now().plusDays(3))
                    .durationHours(duration)
                    .category(category)
                    .price(price)
                    .currency(act.getCurrency() != null ? act.getCurrency() : "EUR")
                    .imageUrl(imageUrl)
                    .description(description)
                    .build();

            offers.add(dto);
        }

        return offers;
    }

    private BigDecimal resolveActivityPrice(HBXActivitySearchResponse.HBXActivity act) {
        if (act.getAmountsFrom() != null && !act.getAmountsFrom().isEmpty()) {
            for (HBXActivitySearchResponse.AmountFrom af : act.getAmountsFrom()) {
                if (af.getAmount() != null && af.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                    return af.getAmount();
                }
            }
        }
        if (act.getModalities() != null && !act.getModalities().isEmpty()) {
            for (HBXActivitySearchResponse.Modality m : act.getModalities()) {
                if (m.getAmountsFrom() != null) {
                    for (HBXActivitySearchResponse.AmountFrom af : m.getAmountsFrom()) {
                        if (af.getAmount() != null && af.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                            return af.getAmount();
                        }
                    }
                }
            }
        }
        return BigDecimal.valueOf(35.00); // Standard baseline if unpriced
    }

    private Double resolveActivityDuration(HBXActivitySearchResponse.HBXActivity act) {
        if (act.getModalities() != null && !act.getModalities().isEmpty()) {
            for (HBXActivitySearchResponse.Modality m : act.getModalities()) {
                if (m.getDuration() != null && m.getDuration().getValue() != null) {
                    Double val = m.getDuration().getValue();
                    String metric = m.getDuration().getMetric();
                    if ("DAYS".equalsIgnoreCase(metric)) {
                        return val * 24.0;
                    }
                    return val;
                }
            }
        }
        return 3.0; // Standard 3h excursion duration default
    }

    private String resolveActivityImage(HBXActivitySearchResponse.HBXActivity act) {
        if (act.getContent() != null && act.getContent().getMedia() != null && act.getContent().getMedia().getImages() != null) {
            for (HBXActivitySearchResponse.Image img : act.getContent().getMedia().getImages()) {
                if (img.getUrls() != null && !img.getUrls().isEmpty()) {
                    for (HBXActivitySearchResponse.ImageUrl u : img.getUrls()) {
                        if (u.getResource() != null && !u.getResource().isBlank()) {
                            return u.getResource();
                        }
                    }
                }
            }
        }
        return "/image/a1.jpg";
    }

    private String resolveActivityDescription(HBXActivitySearchResponse.HBXActivity act) {
        if (act.getContent() != null) {
            if (act.getContent().getDescription() != null && !act.getContent().getDescription().isBlank()) {
                return act.getContent().getDescription();
            }
            if (act.getContent().getSummary() != null && !act.getContent().getSummary().isBlank()) {
                return act.getContent().getSummary();
            }
        }
        return "Découvrez une expérience d'exception organisée par notre partenaire HBX.";
    }

    private boolean isCuratedMarket(String destCode, String queryDest) {
        if ("RAK".equalsIgnoreCase(destCode)) return true;
        if (queryDest != null) {
            String q = queryDest.toUpperCase(Locale.ROOT);
            return q.contains("MARRAK") || q.contains("AGAFAY");
        }
        return false;
    }

    private List<ActivityOfferDto> getCuratedMarrakechOffers(ActivitySearchQuery query) {
        LocalDate date = query.getDate() != null ? query.getDate() : LocalDate.now().plusDays(3);
        return List.of(
                ActivityOfferDto.builder()
                        .offerId("YUDING-CUSTOM-001")
                        .provider("HBX")
                        .source("YUDING_CUSTOM")
                        .title("Excursion Désert d'Agafay & Coucher de Soleil")
                        .destination("Marrakech")
                        .country("Morocco")
                        .date(date)
                        .durationHours(5.0)
                        .category("Aventure")
                        .price(BigDecimal.valueOf(45.00))
                        .currency("EUR")
                        .imageUrl("/image/a1.jpg")
                        .description("Expérience exclusive Yuding: Balade à dos de chameau dans le désert d'Agafay suivie d'un dîner sous tente berbère traditionnelle.")
                        .build(),
                ActivityOfferDto.builder()
                        .offerId("YUDING-CUSTOM-002")
                        .provider("HBX")
                        .source("YUDING_CUSTOM")
                        .title("Visite Guidée des Palais et Médina Historique")
                        .destination("Marrakech")
                        .country("Morocco")
                        .date(date)
                        .durationHours(4.0)
                        .category("Culture")
                        .price(BigDecimal.valueOf(30.00))
                        .currency("EUR")
                        .imageUrl("/image/a2.jpg")
                        .description("Parcours culturel avec guide agréé à travers les ruelles historiques, souks d'artisanat et monuments emblématiques.")
                        .build()
        );
    }

    // ─── Transfers Implementation (Phase 25) ─────────────────────────────────────

    @Override
    public List<TransferOfferDto> searchTransfers(TransferSearchQuery query) throws TravelProviderException {
        validateTransferQuery(query);

        HBXTransfersClient.LocationPoint origin = HBXTransfersClient.resolveOrigin(query.getPickup());
        if (origin == null) {
            throw new TravelProviderException(METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Le point de départ est invalide ou non reconnu: " + query.getPickup());
        }

        HBXTransfersClient.LocationPoint destination = HBXTransfersClient.resolveDestination(query.getDropoff(), origin.code());
        if (destination == null) {
            throw new TravelProviderException(METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Le point d'arrivée est invalide ou non reconnu: " + query.getDropoff());
        }

        LocalDate date = query.getDate() != null ? query.getDate() : LocalDate.now().plusDays(3);
        LocalTime time = query.getTime() != null ? query.getTime() : LocalTime.of(12, 0);
        int pax = query.getPassengers() > 0 ? query.getPassengers() : 2;

        log.info("HBXTravelProvider: Searching transfers from {}:{} to {}:{}, date={}, time={}, pax={}",
                origin.type(), origin.code(), destination.type(), destination.code(), date, time, pax);

        HBXTransferAvailabilityResponse response = transfersClient.searchTransfers(
                "fr",
                origin.type(), origin.code(),
                destination.type(), destination.code(),
                date, time,
                pax, 0, 0
        );

        return normalizeTransfers(response, query);
    }

    private void validateTransferQuery(TransferSearchQuery query) throws TravelProviderException {
        if (query == null) {
            throw new TravelProviderException(METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "La requête de recherche de transferts ne peut pas être vide.");
        }
        if (query.getPickup() == null || query.getPickup().isBlank()) {
            throw new TravelProviderException(METADATA.getProviderCode(),
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Le point de départ est obligatoire pour rechercher des transferts.");
        }
    }

    private List<TransferOfferDto> normalizeTransfers(HBXTransferAvailabilityResponse response, TransferSearchQuery query) {
        List<HBXTransferAvailabilityResponse.TransferService> services = null;
        if (response != null && response.getServices() != null && !response.getServices().isEmpty()) {
            services = response.getServices();
        }

        if (services == null || services.isEmpty()) {
            return Collections.emptyList();
        }

        List<TransferOfferDto> offers = new ArrayList<>();
        LocalDate date = query.getDate() != null ? query.getDate() : LocalDate.now().plusDays(3);
        LocalTime time = query.getTime() != null ? query.getTime() : LocalTime.of(12, 0);

        for (HBXTransferAvailabilityResponse.TransferService svc : services) {
            if (svc == null) continue;

            String transferType = (svc.getTransferType() != null && !svc.getTransferType().isBlank())
                    ? svc.getTransferType().toUpperCase(Locale.ROOT)
                    : "PRIVATE";

            String vehicleName = "Berline Privée Confort";
            if (svc.getVehicle() != null && svc.getVehicle().getName() != null && !svc.getVehicle().getName().isBlank()) {
                vehicleName = svc.getVehicle().getName();
            } else if (svc.getCategory() != null && svc.getCategory().getName() != null && !svc.getCategory().getName().isBlank()) {
                vehicleName = svc.getCategory().getName();
            }

            BigDecimal price = (svc.getPrice() != null && svc.getPrice().getTotalAmount() != null)
                    ? svc.getPrice().getTotalAmount()
                    : BigDecimal.valueOf(25.00);

            String currency = (svc.getPrice() != null && svc.getPrice().getCurrencyId() != null)
                    ? svc.getPrice().getCurrencyId()
                    : "EUR";

            Integer capacity = svc.getMaxPaxCapacity();
            if (capacity == null && svc.getFactsheet() != null) {
                capacity = svc.getFactsheet().getMaxPax();
            }
            if (capacity == null || capacity <= 0) {
                capacity = Math.max(query.getPassengers(), 4);
            }

            String pickupDesc = (query.getPickup() != null && !query.getPickup().isBlank())
                    ? query.getPickup()
                    : "Aéroport";
            String dropoffDesc = (query.getDropoff() != null && !query.getDropoff().isBlank())
                    ? query.getDropoff()
                    : "Centre-ville";

            TransferOfferDto dto = TransferOfferDto.builder()
                    .offerId(svc.getRateKey() != null ? svc.getRateKey() : "HBX-TRF-" + UUID.randomUUID())
                    .provider("HBX")
                    .transferType(transferType)
                    .vehicleModel(vehicleName)
                    .pickup(pickupDesc)
                    .dropoff(dropoffDesc)
                    .date(date)
                    .time(time)
                    .capacity(capacity)
                    .price(price)
                    .currency(currency)
                    .build();

            offers.add(dto);
        }

        return offers;
    }
}
