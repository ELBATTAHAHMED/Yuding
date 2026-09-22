package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.query.TrainSearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.service.TrainRoutingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrainOfferRevalidatorTest {

    @Mock
    private TrainRoutingService trainRoutingService;

    private TrainOfferRevalidator revalidator;

    @BeforeEach
    void setUp() {
        revalidator = new TrainOfferRevalidator(trainRoutingService);
    }

    @Test
    @DisplayName("Train schedule found without fare -> AVAILABLE + NOT_APPLICABLE price status")
    void testTrainScheduleAvailableNoFare() {
        TrainOfferDto trainOffer = TrainOfferDto.builder()
                .offerId("train-oncf-101")
                .provider("ONCF_GTFS")
                .originStation("Casa-Voyageurs")
                .destinationStation("Rabat-Agdal")
                .departureTime("08:00")
                .trainNumber("TNR 101")
                .price(null)
                .currency(null)
                .build();

        when(trainRoutingService.searchTrains(any(TrainSearchQuery.class))).thenReturn(List.of(trainOffer));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("TRAIN")
                .provider("ONCF_GTFS")
                .providerOfferId("train-oncf-101")
                .snapshotProviderAmount(null)
                .snapshotProviderCurrency(null)
                .selectedDetails(Map.of(
                        "originStation", "Casa-Voyageurs",
                        "destinationStation", "Rabat-Agdal",
                        "departureDate", "2026-10-10",
                        "departureTime", "08:00",
                        "trainNumber", "TNR 101"
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.AVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.NOT_APPLICABLE, result.getPriceStatus());
        assertNull(result.getCurrentProviderAmount());
    }

    @Test
    @DisplayName("Train schedule missing on requested date -> UNAVAILABLE")
    void testTrainScheduleMissingUnavailable() {
        when(trainRoutingService.searchTrains(any(TrainSearchQuery.class))).thenReturn(List.of());

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("TRAIN")
                .provider("ONCF_GTFS")
                .providerOfferId("train-oncf-101")
                .snapshotProviderAmount(null)
                .snapshotProviderCurrency(null)
                .selectedDetails(Map.of(
                        "originStation", "Casa-Voyageurs",
                        "destinationStation", "Rabat-Agdal",
                        "departureDate", "2026-10-10",
                        "departureTime", "08:00",
                        "trainNumber", "TNR 101"
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.UNAVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.NOT_AVAILABLE, result.getPriceStatus());
    }
}
