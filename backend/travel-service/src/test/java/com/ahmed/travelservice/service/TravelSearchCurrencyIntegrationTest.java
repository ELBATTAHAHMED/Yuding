package com.ahmed.travelservice.service;

import com.ahmed.travelservice.config.CurrencyProperties;
import com.ahmed.travelservice.currency.CurrencyProvider;
import com.ahmed.travelservice.currency.ExchangeRateQuote;
import com.ahmed.travelservice.dto.request.ActivitySearchRequest;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.HotelSearchRequest;
import com.ahmed.travelservice.dto.request.TransferSearchRequest;
import com.ahmed.travelservice.dto.response.*;
import com.ahmed.travelservice.provider.TravelProduct;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class TravelSearchCurrencyIntegrationTest {
    private TravelProvider provider;
    private TravelSearchService searchService;

    @BeforeEach
    void setUp() {
        TravelProviderRegistry registry = mock(TravelProviderRegistry.class);
        provider = mock(TravelProvider.class);
        when(registry.getProviderForProduct(any(TravelProduct.class))).thenReturn(provider);
        CurrencyProvider currencyProvider = mock(CurrencyProvider.class);
        when(currencyProvider.getExchangeRate("EUR", "MAD"))
                .thenReturn(new ExchangeRateQuote("EUR", "MAD", new BigDecimal("10"), LocalDate.of(2026, 9, 18), "FRANKFURTER"));
        searchService = new TravelSearchService(registry, null, new CurrencyService(currencyProvider, new CurrencyProperties()));
    }

    @Test
    void convertsAllProviderOfferKindsWithoutOverwritingRawAmounts() {
        FlightOfferDto flight = FlightOfferDto.builder().price(new BigDecimal("50")).currency("EUR").build();
        HotelRoomOfferDto room = HotelRoomOfferDto.builder().price(new BigDecimal("200")).pricePerNight(new BigDecimal("100")).currency("EUR").build();
        HotelOfferDto hotel = HotelOfferDto.builder().pricePerNight(new BigDecimal("100")).totalPrice(new BigDecimal("200")).currency("EUR").roomOffers(List.of(room)).build();
        ActivityOfferDto activity = ActivityOfferDto.builder().price(new BigDecimal("30")).currency("EUR").build();
        TransferOfferDto transfer = TransferOfferDto.builder().price(new BigDecimal("40")).currency("EUR").build();
        when(provider.searchFlights(any())).thenReturn(List.of(flight));
        when(provider.searchHotels(any())).thenReturn(List.of(hotel));
        when(provider.searchActivities(any())).thenReturn(List.of(activity));
        when(provider.searchTransfers(any())).thenReturn(List.of(transfer));

        searchService.searchFlights(FlightSearchRequest.builder().origin("CMN").destination("CDG").departureDate(LocalDate.now().plusDays(1)).build());
        searchService.searchHotels(HotelSearchRequest.builder().destination("Paris").checkIn(LocalDate.now().plusDays(1)).checkOut(LocalDate.now().plusDays(2)).build());
        searchService.searchActivities(ActivitySearchRequest.builder().destination("Paris").build());
        searchService.searchTransfers(TransferSearchRequest.builder().pickup("CDG").dropoff("Paris").date(LocalDate.now().plusDays(1)).time(java.time.LocalTime.NOON).build());

        assertThat(flight.getPrice()).isEqualByComparingTo("50");
        assertThat(flight.getPriceConversion().getDisplayAmount()).isEqualByComparingTo("500.00");
        assertThat(hotel.getPricePerNight()).isEqualByComparingTo("100");
        assertThat(hotel.getPriceConversion().getDisplayAmount()).isEqualByComparingTo("1000.00");
        assertThat(room.getPriceConversion().getDisplayAmount()).isEqualByComparingTo("2000.00");
        assertThat(activity.getPriceConversion().getDisplayAmount()).isEqualByComparingTo("300.00");
        assertThat(transfer.getPriceConversion().getDisplayAmount()).isEqualByComparingTo("400.00");
    }
}
