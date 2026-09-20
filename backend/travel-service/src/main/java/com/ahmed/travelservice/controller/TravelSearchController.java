package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.request.ActivitySearchRequest;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.HotelSearchRequest;
import com.ahmed.travelservice.dto.request.RevalidateOfferRequest;
import com.ahmed.travelservice.dto.request.TransferSearchRequest;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.service.TravelSearchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/travel")
@RequiredArgsConstructor
public class TravelSearchController {

    private final TravelSearchService travelSearchService;

    @PostMapping("/flights/search")
    public ResponseEntity<SearchResponse<FlightOfferDto>> searchFlights(
            @Valid @RequestBody FlightSearchRequest request) {
        SearchResponse<FlightOfferDto> response = travelSearchService.searchFlights(request);
        return ResponseEntity.ok(response);
    }

    @org.springframework.web.bind.annotation.GetMapping("/airports")
    public ResponseEntity<java.util.List<AirportDto>> getAirports() {
        return ResponseEntity.ok(travelSearchService.getAirports());
    }

    @PostMapping("/hotels/search")
    public ResponseEntity<SearchResponse<HotelOfferDto>> searchHotels(
            @Valid @RequestBody HotelSearchRequest request) {
        SearchResponse<HotelOfferDto> response = travelSearchService.searchHotels(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/activities/search")
    public ResponseEntity<SearchResponse<ActivityOfferDto>> searchActivities(
            @Valid @RequestBody ActivitySearchRequest request) {
        SearchResponse<ActivityOfferDto> response = travelSearchService.searchActivities(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/transfers/search")
    public ResponseEntity<SearchResponse<TransferOfferDto>> searchTransfers(
            @Valid @RequestBody TransferSearchRequest request) {
        SearchResponse<TransferOfferDto> response = travelSearchService.searchTransfers(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/offers/revalidate")
    public ResponseEntity<OfferRevalidationResult> revalidateOffer(
            @Valid @RequestBody RevalidateOfferRequest request) {
        OfferRevalidationResult response = travelSearchService.revalidateOffer(request);
        return ResponseEntity.ok(response);
    }
}
