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
}
