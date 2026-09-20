package com.ahmed.travelservice.domain;

import com.ahmed.travelservice.domain.enums.ActivityCategory;
import com.ahmed.travelservice.domain.enums.TransferType;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.request.ActivitySearchRequest;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.HotelSearchRequest;
import com.ahmed.travelservice.dto.request.TransferSearchRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

class TravelSearchMapperTest {

    @Test
    @DisplayName("FlightSearchRequest correctly maps to FlightSearchQuery with normalization")
    void testFlightSearchRequestToQuery() {
        FlightSearchRequest req = FlightSearchRequest.builder()
                .origin("  Paris (CDG)  ")
                .destination("  Casablanca (CMN)  ")
                .departureDate(LocalDate.of(2026, 6, 1))
                .returnDate(LocalDate.of(2026, 6, 15))
                .adults(2)
                .children(1)
                .infants(1)
                .travelClass(TravelClass.BUSINESS)
                .nonStop(true)
                .currency("usd")
                .build();

        FlightSearchQuery query = TravelSearchMapper.toQuery(req);

        assertThat(query).isNotNull();
        assertThat(query.getOrigin()).isEqualTo("Paris (CDG)");
        assertThat(query.getDestination()).isEqualTo("Casablanca (CMN)");
        assertThat(query.getDepartureDate()).isEqualTo(LocalDate.of(2026, 6, 1));
        assertThat(query.getReturnDate()).isEqualTo(LocalDate.of(2026, 6, 15));
        assertThat(query.getAdults()).isEqualTo(2);
        assertThat(query.getChildren()).isEqualTo(1);
        assertThat(query.getInfants()).isEqualTo(1);
        assertThat(query.getTravelClass()).isEqualTo(TravelClass.BUSINESS);
        assertThat(query.isNonStop()).isTrue();
        assertThat(query.getCurrency()).isEqualTo("USD");
    }

    @Test
    @DisplayName("HotelSearchRequest correctly maps to HotelSearchQuery with normalization")
    void testHotelSearchRequestToQuery() {
        HotelSearchRequest req = HotelSearchRequest.builder()
                .destination("  Marrakech  ")
                .checkIn(LocalDate.of(2026, 7, 10))
                .checkOut(LocalDate.of(2026, 7, 15))
                .rooms(2)
                .adults(3)
                .children(2)
                .propertyType("resort")
                .currency("mad")
                .build();

        HotelSearchQuery query = TravelSearchMapper.toQuery(req);

        assertThat(query).isNotNull();
        assertThat(query.getDestination()).isEqualTo("Marrakech");
        assertThat(query.getCheckIn()).isEqualTo(LocalDate.of(2026, 7, 10));
        assertThat(query.getCheckOut()).isEqualTo(LocalDate.of(2026, 7, 15));
        assertThat(query.getRooms()).isEqualTo(2);
        assertThat(query.getAdults()).isEqualTo(3);
        assertThat(query.getChildren()).isEqualTo(2);
        assertThat(query.getPropertyType()).isEqualTo("RESORT");
        assertThat(query.getCurrency()).isEqualTo("MAD");
    }

    @Test
    @DisplayName("ActivitySearchRequest correctly maps to ActivitySearchQuery with normalization")
    void testActivitySearchRequestToQuery() {
        ActivitySearchRequest req = ActivitySearchRequest.builder()
                .destination("  Agadir  ")
                .date(LocalDate.of(2026, 8, 20))
                .travelers(4)
                .category("adventure")
                .radiusKm(30)
                .currency("eur")
                .build();

        ActivitySearchQuery query = TravelSearchMapper.toQuery(req);

        assertThat(query).isNotNull();
        assertThat(query.getDestination()).isEqualTo("Agadir");
        assertThat(query.getDate()).isEqualTo(LocalDate.of(2026, 8, 20));
        assertThat(query.getTravelers()).isEqualTo(4);
        assertThat(query.getCategory()).isEqualTo(ActivityCategory.ADVENTURE);
        assertThat(query.getRadiusKm()).isEqualTo(30);
        assertThat(query.getCurrency()).isEqualTo("EUR");
    }

    @Test
    @DisplayName("TransferSearchRequest correctly maps to TransferSearchQuery with normalization")
    void testTransferSearchRequestToQuery() {
        TransferSearchRequest req = TransferSearchRequest.builder()
                .pickup("  Menara Airport  ")
                .dropoff("  City Center  ")
                .date(LocalDate.of(2026, 9, 5))
                .time(LocalTime.of(15, 30))
                .passengers(3)
                .transferType(TransferType.PRIVATE)
                .currency("eur")
                .build();

        TransferSearchQuery query = TravelSearchMapper.toQuery(req);

        assertThat(query).isNotNull();
        assertThat(query.getPickup()).isEqualTo("Menara Airport");
        assertThat(query.getDropoff()).isEqualTo("City Center");
        assertThat(query.getDate()).isEqualTo(LocalDate.of(2026, 9, 5));
        assertThat(query.getTime()).isEqualTo(LocalTime.of(15, 30));
        assertThat(query.getPassengers()).isEqualTo(3);
        assertThat(query.getTransferType()).isEqualTo(TransferType.PRIVATE);
        assertThat(query.getCurrency()).isEqualTo("EUR");
    }

    @Test
    @DisplayName("Null request mappings safely return null")
    void testNullMappings() {
        assertThat(TravelSearchMapper.toQuery((FlightSearchRequest) null)).isNull();
        assertThat(TravelSearchMapper.toQuery((HotelSearchRequest) null)).isNull();
        assertThat(TravelSearchMapper.toQuery((ActivitySearchRequest) null)).isNull();
        assertThat(TravelSearchMapper.toQuery((TransferSearchRequest) null)).isNull();
    }
}
