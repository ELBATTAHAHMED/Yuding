package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.ActivityCategory;
import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.query.ActivitySearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.ActivityOfferDto;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.provider.TravelProduct;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class ActivityOfferRevalidator implements OfferRevalidator {

    private final TravelProviderRegistry providerRegistry;

    public ActivityOfferRevalidator(TravelProviderRegistry providerRegistry) {
        this.providerRegistry = providerRegistry;
    }

    @Override
    public boolean supports(String productType) {
        return "ACTIVITY".equalsIgnoreCase(productType) || "ACTIVITIES".equalsIgnoreCase(productType);
    }

    @Override
    public InternalRevalidationResultDto revalidate(InternalRevalidateOfferRequest request) throws TravelProviderException {
        Map<String, Object> details = request.getSelectedDetails();
        if (details == null || details.isEmpty()) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Missing activity snapshot details for live revalidation"
            );
        }

        String destination = (String) details.get("destination");
        String dateStr = (String) details.get("date");
        String title = (String) details.get("title");
        String categoryStr = (String) details.get("category");

        LocalDate date = dateStr != null ? LocalDate.parse(dateStr) : null;
        if (destination == null || destination.isBlank() || date == null) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Insufficient destination or date details for live activity check"
            );
        }

        ActivityCategory category = ActivityCategory.ALL;
        if (categoryStr != null) {
            try {
                category = ActivityCategory.valueOf(categoryStr.toUpperCase());
            } catch (Exception ignored) {}
        }

        ActivitySearchQuery query = ActivitySearchQuery.builder()
                .destination(destination)
                .date(date)
                .category(category)
                .travelers(1)
                .currency(request.getSnapshotProviderCurrency() != null ? request.getSnapshotProviderCurrency() : "EUR")
                .build();

        TravelProvider provider = resolveProvider(request.getProvider());
        log.info("[ActivityRevalidator] Executing LIVE read-only activity search (NO BOOKING) for destination: {}, date: {}", destination, date);
        List<ActivityOfferDto> freshActivities = provider.searchActivities(query);

        ActivityOfferDto matched = findActivity(freshActivities, request.getProviderOfferId(), title);
        Instant now = Instant.now();

        if (matched != null) {
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
                    .message("Activity offer successfully revalidated live with provider")
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
                .message("Activity offer is no longer available from provider")
                .build();
    }

    private TravelProvider resolveProvider(String providerCode) {
        if (providerCode != null && !providerCode.isBlank()) {
            try {
                TravelProvider p = providerRegistry.getProvider(providerCode);
                if (p != null) return p;
            } catch (Exception ignored) {}
        }
        TravelProvider p = providerRegistry.getProviderForProduct(TravelProduct.ACTIVITIES);
        if (p == null) {
            throw TravelProviderException.notConfigured(providerCode != null ? providerCode : "ACTIVITIES", "Activity provider not configured");
        }
        return p;
    }

    private ActivityOfferDto findActivity(List<ActivityOfferDto> activities, String offerId, String title) {
        if (activities == null || activities.isEmpty()) return null;
        if (offerId != null && !offerId.isBlank()) {
            for (ActivityOfferDto a : activities) {
                if (offerId.equalsIgnoreCase(a.getOfferId())) {
                    return a;
                }
            }
        }
        if (title != null && !title.isBlank()) {
            for (ActivityOfferDto a : activities) {
                if (title.equalsIgnoreCase(a.getTitle())) {
                    return a;
                }
            }
        }
        return null;
    }
}
