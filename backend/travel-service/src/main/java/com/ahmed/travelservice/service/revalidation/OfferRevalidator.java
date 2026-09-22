package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.provider.error.TravelProviderException;

/**
 * Strategy interface for provider-specific, read-only live offer revalidation.
 */
public interface OfferRevalidator {

    /**
     * Checks if this revalidator supports the given product type.
     */
    boolean supports(String productType);

    /**
     * Performs read-only live revalidation and returns a normalized result.
     * Throws TravelProviderException on network/provider failures (which must NOT be mapped to UNAVAILABLE).
     */
    InternalRevalidationResultDto revalidate(InternalRevalidateOfferRequest request) throws TravelProviderException;
}
