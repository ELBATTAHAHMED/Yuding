package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Central orchestrator for live offer revalidation across travel domains.
 */
@Service
@Slf4j
public class OfferRevalidationService {

    private static final Duration DEFAULT_VALIDITY = Duration.ofMinutes(5);

    private final List<OfferRevalidator> revalidators;

    public OfferRevalidationService(List<OfferRevalidator> revalidators) {
        this.revalidators = revalidators != null ? revalidators : List.of();
    }

    /**
     * Performs live read-only revalidation of an offer.
     */
    public InternalRevalidationResultDto revalidateOffer(InternalRevalidateOfferRequest request) {
        if (request == null || request.getProductType() == null) {
            return InternalRevalidationResultDto.unsupported("UNKNOWN", "UNKNOWN", null, "Request is missing product type");
        }

        OfferRevalidator revalidator = revalidators.stream()
                .filter(r -> r.supports(request.getProductType()))
                .findFirst()
                .orElse(null);

        if (revalidator == null) {
            log.warn("[OfferRevalidationService] No revalidator strategy found for productType: {}", request.getProductType());
            return InternalRevalidationResultDto.unsupported(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Live revalidation is not supported for product type: " + request.getProductType()
            );
        }

        try {
            InternalRevalidationResultDto result = revalidator.revalidate(request);
            if (result.getRevalidatedAt() == null) {
                result.setRevalidatedAt(Instant.now());
            }

            // Calculate validUntil = min(revalidatedAt + DEFAULT_VALIDITY, providerExpiresAt)
            Instant validUntil = result.getRevalidatedAt().plus(DEFAULT_VALIDITY);
            if (result.getProviderExpiresAt() != null && result.getProviderExpiresAt().isBefore(validUntil)) {
                validUntil = result.getProviderExpiresAt();
            }
            result.setValidUntil(validUntil);

            return result;
        } catch (TravelProviderException e) {
            log.error("[OfferRevalidationService] Provider failure during revalidation [offerId={}, code={}]: {}",
                    request.getProviderOfferId(), e.getErrorCode(), e.getMessage());
            // Provider errors must NOT be silently mapped to UNAVAILABLE
            throw e;
        } catch (Exception e) {
            log.error("[OfferRevalidationService] Unexpected error during revalidation [offerId={}]: {}",
                    request.getProviderOfferId(), e.getMessage(), e);
            throw new TravelProviderException("TRAVEL-SERVICE", ProviderErrorCode.PROVIDER_UNAVAILABLE, "Failed to revalidate offer: " + e.getMessage());
        }
    }
}
