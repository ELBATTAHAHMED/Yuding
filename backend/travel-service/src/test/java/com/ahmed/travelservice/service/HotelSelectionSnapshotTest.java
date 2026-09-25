package com.ahmed.travelservice.service;

import com.ahmed.travelservice.cache.OfferSelectionCache;
import com.ahmed.travelservice.dto.response.HotelOfferDto;
import com.ahmed.travelservice.dto.response.HotelRoomOfferDto;
import com.ahmed.travelservice.dto.response.ResolvedOfferDto;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class HotelSelectionSnapshotTest {
    @Test
    void roomSelectionDoesNotDuplicateEveryOtherRoomInItsSnapshot() {
        OfferSelectionCache cache = mock(OfferSelectionCache.class);
        TravelSearchService service = new TravelSearchService(mock(TravelProviderRegistry.class),
                null, null, null, null, cache);
        HotelRoomOfferDto room = HotelRoomOfferDto.builder()
                .offerId("provider-room-1").roomName("Double")
                .price(new BigDecimal("120")).currency("EUR").build();
        HotelOfferDto hotel = HotelOfferDto.builder()
                .hotelId("hotel-1").offerId("provider-hotel-1")
                .hotelName("Test Hotel").roomOffers(List.of(room))
                .totalPrice(new BigDecimal("120")).currency("EUR").build();

        service.registerHotelOffers(List.of(hotel));

        ArgumentCaptor<ResolvedOfferDto> snapshots = ArgumentCaptor.forClass(ResolvedOfferDto.class);
        verify(cache, times(2)).put(anyString(), snapshots.capture());
        assertThat(snapshots.getAllValues().get(0).getSelectedDetails()).containsKey("roomOffers");
        assertThat(snapshots.getAllValues().get(1).getSelectedDetails()).containsKey("selectedRoom");
        assertThat(snapshots.getAllValues().get(1).getSelectedDetails()).doesNotContainKey("roomOffers");
    }
}
