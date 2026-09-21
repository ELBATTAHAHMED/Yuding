package com.ahmed.travelservice.provider.nuitee;

import com.ahmed.travelservice.domain.query.FlightSearchQuery;
import com.ahmed.travelservice.domain.query.HotelSearchQuery;
import com.ahmed.travelservice.dto.response.HotelOfferDto;
import com.ahmed.travelservice.dto.response.HotelRoomOfferDto;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.nuitee.NuiteeClient;
import com.ahmed.travelservice.provider.impl.nuitee.NuiteeTravelProvider;
import com.ahmed.travelservice.provider.impl.nuitee.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NuiteeTravelProviderTest {

    @Mock
    private NuiteeClient client;

    private NuiteeTravelProvider provider;

    @BeforeEach
    void setUp() {
        provider = new NuiteeTravelProvider(client);
    }

    @Test
    @DisplayName("Metadata reports provider code NUITEE and supports HOTELS capability only")
    void metadata_reportsHotelsCapabilityOnly() {
        assertThat(provider.getMetadata().getProviderCode()).isEqualTo("NUITEE");
        assertThat(provider.supports(ProviderCapability.HOTELS)).isTrue();
        assertThat(provider.supports(ProviderCapability.FLIGHTS)).isFalse();
        assertThat(provider.supports(ProviderCapability.ACTIVITIES)).isFalse();
        assertThat(provider.supports(ProviderCapability.TRANSFERS)).isFalse();
    }

    @Test
    @DisplayName("searchFlights throws CAPABILITY_NOT_SUPPORTED")
    void searchFlights_throwsCapabilityNotSupported() {
        assertThatThrownBy(() -> provider.searchFlights(FlightSearchQuery.builder().build()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException te = (TravelProviderException) e;
                    assertThat(te.getErrorCode()).isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED);
                });
    }

    @Test
    @DisplayName("Validates check-in not in the past and check-out after check-in")
    void searchHotels_validatesDates() {
        LocalDate today = LocalDate.now();

        // Past check-in
        HotelSearchQuery pastQuery = HotelSearchQuery.builder()
                .destination("Marrakech")
                .checkIn(today.minusDays(1))
                .checkOut(today.plusDays(2))
                .build();

        assertThatThrownBy(() -> provider.searchHotels(pastQuery))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_REQUEST_INVALID));

        // check-out before check-in
        HotelSearchQuery invalidCheckout = HotelSearchQuery.builder()
                .destination("Marrakech")
                .checkIn(today.plusDays(3))
                .checkOut(today.plusDays(2))
                .build();

        assertThatThrownBy(() -> provider.searchHotels(invalidCheckout))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_REQUEST_INVALID));
    }

    @Test
    @DisplayName("Correctly maps multi-room occupancy and child ages into NuiteeRatesRequest")
    void searchHotels_mapsOccupanciesAndChildren() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = LocalDate.now().plusDays(15);

        HotelSearchQuery query = HotelSearchQuery.builder()
                .destination("Marrakech, Maroc")
                .city("Marrakech")
                .countryCode("MA")
                .checkIn(checkIn)
                .checkOut(checkOut)
                .currency("MAD")
                .guestNationality("MA")
                .occupancies(List.of(
                        HotelSearchQuery.RoomOccupancy.builder().adults(2).childrenAges(List.of(5, 10)).build(),
                        HotelSearchQuery.RoomOccupancy.builder().adults(1).childrenAges(Collections.emptyList()).build()
                ))
                .build();

        when(client.searchHotelRates(any())).thenReturn(NuiteeRatesResponse.builder().data(Collections.emptyList()).build());

        provider.searchHotels(query);

        ArgumentCaptor<NuiteeRatesRequest> captor = ArgumentCaptor.forClass(NuiteeRatesRequest.class);
        verify(client).searchHotelRates(captor.capture());

        NuiteeRatesRequest sent = captor.getValue();
        assertThat(sent.getCheckin()).isEqualTo(checkIn.toString());
        assertThat(sent.getCheckout()).isEqualTo(checkOut.toString());
        assertThat(sent.getCityName()).isEqualTo("Marrakech");
        assertThat(sent.getCountryCode()).isEqualTo("MA");
        assertThat(sent.getCurrency()).isEqualTo("MAD");
        assertThat(sent.getGuestNationality()).isEqualTo("MA");
        assertThat(sent.getOccupancies()).hasSize(2);
        assertThat(sent.getOccupancies().get(0).getAdults()).isEqualTo(2);
        assertThat(sent.getOccupancies().get(0).getChildren()).containsExactly(5, 10);
        assertThat(sent.getOccupancies().get(1).getAdults()).isEqualTo(1);
    }

    @Test
    @DisplayName("Normalizes response preserving hotel metadata, room offers, BigDecimal price, and real offerId")
    void searchHotels_normalizesHotelAndRoomOffers() throws Exception {
        LocalDate checkIn = LocalDate.now().plusDays(10);
        LocalDate checkOut = LocalDate.now().plusDays(12);

        NuiteeRatesResponse mockResponse = NuiteeRatesResponse.builder()
                .hotels(List.of(
                        NuiteeHotelData.builder()
                                .id("lp100")
                                .name("Palais Riad Marrakech")
                                .address("Medina, Rue 12")
                                .cityName("Marrakech")
                                .countryCode("MA")
                                .stars(5.0)
                                .rating(9.2)
                                .reviewCount(250)
                                .hotelTypeId(227)
                                .mainPhoto("https://cdn.example.com/riad.jpg")
                                .build()
                ))
                .data(List.of(
                        NuiteeHotelRatesData.builder()
                                .hotelId("lp100")
                                .roomTypes(List.of(
                                        NuiteeRoomType.builder()
                                                .roomTypeId("rt_deluxe")
                                                .offerId("OFFER_NUITEE_REAL_12345")
                                                .rates(List.of(
                                                        NuiteeRate.builder()
                                                                .rateId("rate_999")
                                                                .name("Suite Deluxe Jardin")
                                                                .boardType("BI")
                                                                .boardName("Breakfast Included")
                                                                .maxOccupancy(2)
                                                                .adultCount(2)
                                                                .childCount(0)
                                                                .retailRate(NuiteeRetailRate.builder()
                                                                        .total(List.of(NuiteePriceItem.builder()
                                                                                .amount(new BigDecimal("300.00"))
                                                                                .currency("EUR")
                                                                                .build()))
                                                                        .build())
                                                                .cancellationPolicies(NuiteeCancellationPolicies.builder()
                                                                        .refundableTag("RFN")
                                                                        .cancelPolicyInfos(List.of(NuiteeCancelPolicyInfo.builder()
                                                                                .cancelTime("2026-10-01 12:00:00")
                                                                                .amount(new BigDecimal("300.00"))
                                                                                .currency("EUR")
                                                                                .build()))
                                                                        .build())
                                                                .build()
                                                ))
                                                .build()
                                ))
                                .build()
                ))
                .build();

        when(client.searchHotelRates(any())).thenReturn(mockResponse);

        HotelSearchQuery query = HotelSearchQuery.builder()
                .destination("Marrakech")
                .city("Marrakech")
                .countryCode("MA")
                .checkIn(checkIn)
                .checkOut(checkOut)
                .rooms(1)
                .adults(2)
                .currency("EUR")
                .build();

        List<HotelOfferDto> results = provider.searchHotels(query);

        assertThat(results).hasSize(1);
        HotelOfferDto hotel = results.get(0);
        assertThat(hotel.getHotelId()).isEqualTo("lp100");
        assertThat(hotel.getHotelName()).isEqualTo("Palais Riad Marrakech");
        assertThat(hotel.getProvider()).isEqualTo("NUITEE");
        assertThat(hotel.getAccommodationType()).isEqualTo("RIAD");
        assertThat(hotel.getAvailabilityState()).isEqualTo("AVAILABLE_ON_PROVIDER");
        assertThat(hotel.getOfferId()).isEqualTo("OFFER_NUITEE_REAL_12345");
        assertThat(hotel.getTotalPrice()).isEqualByComparingTo(new BigDecimal("300.00"));
        assertThat(hotel.getPricePerNight()).isEqualByComparingTo(new BigDecimal("150.00")); // 300 / 2 nights
        assertThat(hotel.getStarRating()).isEqualTo(5.0);
        assertThat(hotel.getReviewScore()).isEqualTo(9.2);
        assertThat(hotel.getImageUrl()).isEqualTo("https://cdn.example.com/riad.jpg");

        // Check room offer
        assertThat(hotel.getRoomOffers()).hasSize(1);
        HotelRoomOfferDto room = hotel.getRoomOffers().get(0);
        assertThat(room.getOfferId()).isEqualTo("OFFER_NUITEE_REAL_12345");
        assertThat(room.getRateId()).isEqualTo("rate_999");
        assertThat(room.getRoomName()).isEqualTo("Suite Deluxe Jardin");
        assertThat(room.getBoardName()).isEqualTo("Breakfast Included");
        assertThat(room.getRefundable()).isTrue();
        assertThat(room.getCancellationDeadline()).isEqualTo("2026-10-01 12:00:00");
        assertThat(room.getPrice()).isEqualByComparingTo(new BigDecimal("300.00"));
    }

    @Test
    @DisplayName("Empty data from Nuitee returns empty list without error")
    void searchHotels_emptyResponseReturnsEmptyList() throws Exception {
        when(client.searchHotelRates(any())).thenReturn(NuiteeRatesResponse.builder().data(Collections.emptyList()).build());

        HotelSearchQuery query = HotelSearchQuery.builder()
                .destination("Marrakech")
                .checkIn(LocalDate.now().plusDays(2))
                .checkOut(LocalDate.now().plusDays(4))
                .build();

        List<HotelOfferDto> results = provider.searchHotels(query);
        assertThat(results).isEmpty();
    }
}
