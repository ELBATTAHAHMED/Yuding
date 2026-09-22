package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.query.FlightSearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.FlightOfferDto;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FlightOfferRevalidatorTest {

    @Mock
    private TravelProviderRegistry providerRegistry;

    @Mock
    private TravelProvider flightProvider;

    private FlightOfferRevalidator revalidator;

    @BeforeEach
    void setUp() {
        revalidator = new FlightOfferRevalidator(providerRegistry);
        lenient().when(providerRegistry.getProvider(any())).thenReturn(flightProvider);
        lenient().when(providerRegistry.getProviderForProduct(any())).thenReturn(flightProvider);
    }

    @Test
    @DisplayName("Exact flight found with same price -> AVAILABLE + UNCHANGED")
    void testExactMatchSamePrice() {
        FlightOfferDto liveOffer = FlightOfferDto.builder()
                .offerId("scrappa-101")
                .provider("SCRAPPA")
                .origin("CDG")
                .destination("CMN")
                .departureTime("2026-10-15T10:00:00")
                .airlineCode("AT")
                .flightNumber("AT800")
                .price(new BigDecimal("150.00"))
                .currency("EUR")
                .build();

        when(flightProvider.searchFlights(any(FlightSearchQuery.class))).thenReturn(List.of(liveOffer));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .providerOfferId("scrappa-101")
                .snapshotProviderAmount(new BigDecimal("150.00"))
                .snapshotProviderCurrency("EUR")
                .selectedDetails(Map.of(
                        "origin", "CDG",
                        "destination", "CMN",
                        "departureTime", "2026-10-15T10:00:00",
                        "airlineCode", "AT",
                        "flightNumber", "AT800"
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.AVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.UNCHANGED, result.getPriceStatus());
        assertEquals(new BigDecimal("150.00"), result.getCurrentProviderAmount());
        assertEquals("EUR", result.getCurrentProviderCurrency());
    }

    @Test
    @DisplayName("Exact flight found with increased price -> AVAILABLE + CHANGED")
    void testExactMatchPriceChanged() {
        FlightOfferDto liveOffer = FlightOfferDto.builder()
                .offerId("scrappa-101")
                .provider("SCRAPPA")
                .origin("CDG")
                .destination("CMN")
                .departureTime("2026-10-15T10:00:00")
                .airlineCode("AT")
                .flightNumber("AT800")
                .price(new BigDecimal("185.00"))
                .currency("EUR")
                .build();

        when(flightProvider.searchFlights(any(FlightSearchQuery.class))).thenReturn(List.of(liveOffer));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .providerOfferId("scrappa-101")
                .snapshotProviderAmount(new BigDecimal("150.00"))
                .snapshotProviderCurrency("EUR")
                .selectedDetails(Map.of(
                        "origin", "CDG",
                        "destination", "CMN",
                        "departureTime", "2026-10-15T10:00:00",
                        "airlineCode", "AT",
                        "flightNumber", "AT800"
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.AVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.CHANGED, result.getPriceStatus());
        assertEquals(new BigDecimal("185.00"), result.getCurrentProviderAmount());
    }

    @Test
    @DisplayName("Different flight on same route must not match -> UNAVAILABLE")
    void testDifferentFlightSameRouteDoesNotMatch() {
        FlightOfferDto differentFlight = FlightOfferDto.builder()
                .offerId("scrappa-999")
                .provider("SCRAPPA")
                .origin("CDG")
                .destination("CMN")
                .departureTime("2026-10-15T18:00:00")
                .airlineCode("AF")
                .flightNumber("AF123")
                .price(new BigDecimal("120.00"))
                .currency("EUR")
                .build();

        when(flightProvider.searchFlights(any(FlightSearchQuery.class))).thenReturn(List.of(differentFlight));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .providerOfferId("scrappa-101")
                .snapshotProviderAmount(new BigDecimal("150.00"))
                .snapshotProviderCurrency("EUR")
                .selectedDetails(Map.of(
                        "origin", "CDG",
                        "destination", "CMN",
                        "departureTime", "2026-10-15T10:00:00",
                        "airlineCode", "AT",
                        "flightNumber", "AT800"
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.UNAVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.NOT_AVAILABLE, result.getPriceStatus());
    }

    @Test
    @DisplayName("Provider failure throws TravelProviderException (must NOT be mapped to UNAVAILABLE)")
    void testProviderErrorThrowsException() {
        when(flightProvider.searchFlights(any(FlightSearchQuery.class)))
                .thenThrow(new TravelProviderException("SCRAPPA", ProviderErrorCode.PROVIDER_UNAVAILABLE, "Scrappa 500 downstream error"));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .providerOfferId("scrappa-101")
                .snapshotProviderAmount(new BigDecimal("150.00"))
                .snapshotProviderCurrency("EUR")
                .selectedDetails(Map.of(
                        "origin", "CDG",
                        "destination", "CMN",
                        "departureTime", "2026-10-15T10:00:00"
                ))
                .build();

        assertThrows(TravelProviderException.class, () -> revalidator.revalidate(request));
    }
}
