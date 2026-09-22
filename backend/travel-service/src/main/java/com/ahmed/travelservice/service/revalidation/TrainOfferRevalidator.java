package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.query.TrainSearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.service.TrainRoutingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Component
@Slf4j
public class TrainOfferRevalidator implements OfferRevalidator {

    private final TrainRoutingService trainRoutingService;

    public TrainOfferRevalidator(TrainRoutingService trainRoutingService) {
        this.trainRoutingService = trainRoutingService;
    }

    @Override
    public boolean supports(String productType) {
        return "TRAIN".equalsIgnoreCase(productType) || "TRAINS".equalsIgnoreCase(productType);
    }

    @Override
    public InternalRevalidationResultDto revalidate(InternalRevalidateOfferRequest request) throws TravelProviderException {
        Map<String, Object> details = request.getSelectedDetails();
        if (details == null || details.isEmpty()) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Missing train snapshot details for live revalidation"
            );
        }

        String origin = (String) details.get("originStation");
        String destination = (String) details.get("destinationStation");
        String departureDateStr = (String) details.get("departureDate");
        String departureTimeStr = (String) details.get("departureTime");
        String trainNumber = (String) details.get("trainNumber");
        String routeName = (String) details.get("routeName");

        LocalDate departureDate = departureDateStr != null ? LocalDate.parse(departureDateStr) : null;
        if (origin == null || destination == null || departureDate == null) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Insufficient stations or departure date for live train check"
            );
        }

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation(origin)
                .destinationStation(destination)
                .date(departureDate)
                .build();

        log.info("[TrainRevalidator] Executing LIVE train schedule check: {} -> {} on {}", origin, destination, departureDate);
        List<TrainOfferDto> freshOffers = trainRoutingService.searchTrains(query);

        TrainOfferDto matched = findTrain(freshOffers, request.getProviderOfferId(), trainNumber, routeName, departureTimeStr);
        Instant now = Instant.now();

        if (matched != null) {
            // Price status for trains without live fares is NOT_APPLICABLE
            OfferPriceStatus priceStatus = OfferPriceComparator.comparePrices(
                    request.getSnapshotProviderAmount(),
                    request.getSnapshotProviderCurrency(),
                    matched.getPrice(),
                    matched.getCurrency()
            );

            return InternalRevalidationResultDto.builder()
                    .productType(request.getProductType())
                    .provider(matched.getProvider() != null ? matched.getProvider() : request.getProvider())
                    .providerOfferId(request.getProviderOfferId())
                    .matchedProviderOfferId(matched.getOfferId())
                    .availabilityStatus(OfferAvailabilityStatus.AVAILABLE)
                    .priceStatus(priceStatus)
                    .snapshotProviderAmount(request.getSnapshotProviderAmount())
                    .snapshotProviderCurrency(request.getSnapshotProviderCurrency())
                    .currentProviderAmount(matched.getPrice())
                    .currentProviderCurrency(matched.getCurrency())
                    .revalidatedAt(now)
                    .providerExpiresAt(request.getProviderExpiresAt())
                    .message("Train schedule successfully revalidated live")
                    .build();
        }

        return InternalRevalidationResultDto.builder()
                .productType(request.getProductType())
                .provider(request.getProvider())
                .providerOfferId(request.getProviderOfferId())
                .availabilityStatus(OfferAvailabilityStatus.UNAVAILABLE)
                .priceStatus(OfferPriceStatus.NOT_AVAILABLE)
                .snapshotProviderAmount(request.getSnapshotProviderAmount())
                .snapshotProviderCurrency(request.getSnapshotProviderCurrency())
                .revalidatedAt(now)
                .message("Train schedule/journey is no longer available on requested date")
                .build();
    }

    private TrainOfferDto findTrain(List<TrainOfferDto> trains, String offerId, String trainNumber, String routeName, String departureTimeStr) {
        if (trains == null || trains.isEmpty()) return null;

        if (offerId != null && !offerId.isBlank()) {
            for (TrainOfferDto t : trains) {
                if (offerId.equalsIgnoreCase(t.getOfferId())) {
                    return t;
                }
            }
        }

        for (TrainOfferDto t : trains) {
            boolean numMatches = trainNumber == null || trainNumber.equalsIgnoreCase(t.getTrainNumber());
            boolean routeMatches = routeName == null || routeName.equalsIgnoreCase(t.getRouteName());
            boolean timeMatches = departureTimeStr == null || Objects.equals(departureTimeStr, t.getDepartureTime());

            if (numMatches && routeMatches && timeMatches) {
                return t;
            }
        }

        return null;
    }
}
