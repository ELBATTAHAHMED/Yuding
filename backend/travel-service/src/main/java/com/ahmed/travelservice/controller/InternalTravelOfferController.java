package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.response.ResolvedOfferDto;
import com.ahmed.travelservice.service.TravelSearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal service-to-service endpoint for resolving server-issued offer selection references.
 * Kept internal and not exposed through API Gateway to external users.
 */
@RestController
@RequestMapping("/internal/travel")
@RequiredArgsConstructor
@Slf4j
public class InternalTravelOfferController {

    private final TravelSearchService travelSearchService;
    private final com.ahmed.travelservice.service.revalidation.OfferRevalidationService offerRevalidationService;

    /**
     * Resolves a trusted discovery offer by its opaque selection reference.
     * Used by reservation-service to create immutable offer snapshots.
     */
    @GetMapping("/offers/resolve/{selectionRef}")
    public ResponseEntity<ResolvedOfferDto> resolveOffer(@PathVariable String selectionRef) {
        log.info("Internal: Resolving offer selection reference [{}]", selectionRef);
        return travelSearchService.resolveOfferSelection(selectionRef)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    log.warn("Internal: Selection reference [{}] not found or expired", selectionRef);
                    return ResponseEntity.notFound().build();
                });
    }

    /**
     * Revalidates an offer snapshot against live provider sources (search cache bypassed).
     * Used by reservation-service prior to pricing/payment flow.
     */
    @org.springframework.web.bind.annotation.PostMapping("/offers/revalidate")
    public ResponseEntity<com.ahmed.travelservice.dto.response.InternalRevalidationResultDto> revalidateOffer(
            @jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest request) {
        log.info("Internal: Revalidating offer snapshot [provider={}, productType={}, offerId={}]",
                request.getProvider(), request.getProductType(), request.getProviderOfferId());
        com.ahmed.travelservice.dto.response.InternalRevalidationResultDto result = offerRevalidationService.revalidateOffer(request);
        return ResponseEntity.ok(result);
    }
}
