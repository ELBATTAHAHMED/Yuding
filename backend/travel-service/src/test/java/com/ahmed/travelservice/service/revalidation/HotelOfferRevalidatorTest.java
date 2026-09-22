package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.query.HotelSearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.HotelOfferDto;
import com.ahmed.travelservice.dto.response.HotelRoomOfferDto;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HotelOfferRevalidatorTest {

    @Mock
    private TravelProviderRegistry providerRegistry;

    @Mock
    private TravelProvider hotelProvider;

    private HotelOfferRevalidator revalidator;

    @BeforeEach
    void setUp() {
        revalidator = new HotelOfferRevalidator(providerRegistry);
        lenient().when(providerRegistry.getProvider(any())).thenReturn(hotelProvider);
        lenient().when(providerRegistry.getProviderForProduct(any())).thenReturn(hotelProvider);
    }

    @Test
    @DisplayName("Hotel and room rate available with same price -> AVAILABLE + UNCHANGED")
    void testHotelRoomAvailableSamePrice() {
        HotelRoomOfferDto room = HotelRoomOfferDto.builder()
                .offerId("room-offer-1")
                .rateId("rate-standard-101")
                .roomName("Deluxe King Room")
                .price(new BigDecimal("220.00"))
                .currency("USD")
                .build();

        HotelOfferDto hotel = HotelOfferDto.builder()
                .hotelId("hotel-marrakech-5")
                .hotelName("Royal Mansour")
                .currency("USD")
                .totalPrice(new BigDecimal("220.00"))
                .roomOffers(List.of(room))
                .build();

        when(hotelProvider.searchHotels(any(HotelSearchQuery.class))).thenReturn(List.of(hotel));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("HOTEL")
                .provider("NUITEE")
                .providerOfferId("room-offer-1")
                .snapshotProviderAmount(new BigDecimal("220.00"))
                .snapshotProviderCurrency("USD")
                .selectedDetails(Map.of(
                        "hotelId", "hotel-marrakech-5",
                        "city", "Marrakech",
                        "checkIn", "2026-11-01",
                        "checkOut", "2026-11-05",
                        "selectedRoom", Map.of("rateId", "rate-standard-101", "roomName", "Deluxe King Room")
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.AVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.UNCHANGED, result.getPriceStatus());
        assertEquals(new BigDecimal("220.00"), result.getCurrentProviderAmount());
    }

    @Test
    @DisplayName("Hotel found but selected room rate missing -> UNAVAILABLE")
    void testHotelFoundRoomMissingUnavailable() {
        HotelRoomOfferDto otherRoom = HotelRoomOfferDto.builder()
                .offerId("room-offer-99")
                .rateId("rate-presidential-999")
                .roomName("Presidential Suite")
                .price(new BigDecimal("1200.00"))
                .currency("USD")
                .build();

        HotelOfferDto hotel = HotelOfferDto.builder()
                .hotelId("hotel-marrakech-5")
                .hotelName("Royal Mansour")
                .currency("USD")
                .roomOffers(List.of(otherRoom))
                .build();

        when(hotelProvider.searchHotels(any(HotelSearchQuery.class))).thenReturn(List.of(hotel));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("HOTEL")
                .provider("NUITEE")
                .providerOfferId("room-offer-1")
                .snapshotProviderAmount(new BigDecimal("220.00"))
                .snapshotProviderCurrency("USD")
                .selectedDetails(Map.of(
                        "hotelId", "hotel-marrakech-5",
                        "city", "Marrakech",
                        "checkIn", "2026-11-01",
                        "checkOut", "2026-11-05",
                        "selectedRoom", Map.of("rateId", "rate-standard-101", "roomName", "Deluxe King Room")
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.UNAVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.NOT_AVAILABLE, result.getPriceStatus());
    }
}
