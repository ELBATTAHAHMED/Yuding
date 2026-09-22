package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.enums.TransferType;
import com.ahmed.travelservice.domain.query.TransferSearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.dto.response.TransferOfferDto;
import com.ahmed.travelservice.provider.TravelProduct;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class TransferOfferRevalidator implements OfferRevalidator {

    private final TravelProviderRegistry providerRegistry;

    public TransferOfferRevalidator(TravelProviderRegistry providerRegistry) {
        this.providerRegistry = providerRegistry;
    }

    @Override
    public boolean supports(String productType) {
        return "TRANSFER".equalsIgnoreCase(productType) || "TRANSFERS".equalsIgnoreCase(productType);
    }

    @Override
    public InternalRevalidationResultDto revalidate(InternalRevalidateOfferRequest request) throws TravelProviderException {
        Map<String, Object> details = request.getSelectedDetails();
        if (details == null || details.isEmpty()) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Missing transfer snapshot details for live revalidation"
            );
        }

        String pickup = (String) details.get("pickup");
        String dropoff = (String) details.get("dropoff");
        String dateStr = (String) details.get("date");
        String timeStr = (String) details.get("time");
        String transferTypeStr = (String) details.get("transferType");
        String vehicleModel = (String) details.get("vehicleModel");

        LocalDate date = dateStr != null ? LocalDate.parse(dateStr) : null;
        LocalTime time = timeStr != null ? LocalTime.parse(timeStr) : LocalTime.of(12, 0);

        if (pickup == null || dropoff == null || date == null) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Insufficient pickup, dropoff, or date details for live transfer check"
            );
        }

        TransferType transferType = TransferType.TAXI;
        if (transferTypeStr != null) {
            try {
                transferType = TransferType.valueOf(transferTypeStr.toUpperCase());
            } catch (Exception ignored) {}
        }

        TransferSearchQuery query = TransferSearchQuery.builder()
                .pickup(pickup)
                .dropoff(dropoff)
                .date(date)
                .time(time)
                .transferType(transferType)
                .passengers(1)
                .currency(request.getSnapshotProviderCurrency() != null ? request.getSnapshotProviderCurrency() : "EUR")
                .build();

        TravelProvider provider = resolveProvider(request.getProvider());
        log.info("[TransferRevalidator] Executing LIVE read-only transfer search (NO BOOKING) from {} to {} on {}", pickup, dropoff, date);
        List<TransferOfferDto> freshTransfers = provider.searchTransfers(query);

        TransferOfferDto matched = findTransfer(freshTransfers, request.getProviderOfferId(), vehicleModel);
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
                    .message("Transfer offer successfully revalidated live with provider")
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
                .message("Transfer offer is no longer available from provider")
                .build();
    }

    private TravelProvider resolveProvider(String providerCode) {
        if (providerCode != null && !providerCode.isBlank()) {
            try {
                TravelProvider p = providerRegistry.getProvider(providerCode);
                if (p != null) return p;
            } catch (Exception ignored) {}
        }
        TravelProvider p = providerRegistry.getProviderForProduct(TravelProduct.TRANSFERS);
        if (p == null) {
            throw TravelProviderException.notConfigured(providerCode != null ? providerCode : "TRANSFERS", "Transfer provider not configured");
        }
        return p;
    }

    private TransferOfferDto findTransfer(List<TransferOfferDto> transfers, String offerId, String vehicleModel) {
        if (transfers == null || transfers.isEmpty()) return null;
        if (offerId != null && !offerId.isBlank()) {
            for (TransferOfferDto t : transfers) {
                if (offerId.equalsIgnoreCase(t.getOfferId())) {
                    return t;
                }
            }
        }
        if (vehicleModel != null && !vehicleModel.isBlank()) {
            for (TransferOfferDto t : transfers) {
                if (vehicleModel.equalsIgnoreCase(t.getVehicleModel())) {
                    return t;
                }
            }
        }
        return null;
    }
}
