package com.ahmed.reservationservice.feign;

import com.ahmed.reservationservice.domain.dto.ResolvedOfferDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.Optional;

@FeignClient(name = "TRAVEL-SERVICE")
public interface TravelOfferResolverClient {

    @GetMapping("/internal/travel/offers/resolve/{selectionRef}")
    Optional<ResolvedOfferDto> resolveOfferSelection(@PathVariable("selectionRef") String selectionRef);

    @org.springframework.web.bind.annotation.PostMapping("/internal/travel/offers/revalidate")
    com.ahmed.reservationservice.domain.dto.InternalRevalidationResultDto revalidateOffer(
            @org.springframework.web.bind.annotation.RequestBody com.ahmed.reservationservice.domain.dto.InternalRevalidateOfferRequest request);
}
