package com.ahmed.travelservice.provider.transitland;

import com.ahmed.travelservice.config.TransitlandProperties;
import com.ahmed.travelservice.domain.query.TrainSearchQuery;
import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.dto.response.TrainStationDto;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.transitland.TransitlandClient;
import com.ahmed.travelservice.provider.impl.transitland.TransitlandTravelProvider;
import com.ahmed.travelservice.provider.impl.transitland.dto.TransitlandModels;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransitlandTravelProviderTest {

    @Mock
    private TransitlandClient client;

    private TransitlandProperties properties;
    private TransitlandTravelProvider provider;

    @BeforeEach
    void setUp() {
        properties = new TransitlandProperties();
        properties.setOncfFeedId("f-oncf~morocco~rail");
        provider = new TransitlandTravelProvider(client, properties);
    }

    @Test
    @DisplayName("Metadata reports TRANSITLAND code and TRAINS capability")
    void metadata_reportsCorrectCapabilities() {
        assertThat(provider.getMetadata().getProviderCode()).isEqualTo("TRANSITLAND");
        assertThat(provider.supports(ProviderCapability.TRAINS)).isTrue();
        assertThat(provider.supports(ProviderCapability.FLIGHTS)).isFalse();
        assertThat(provider.supports(ProviderCapability.HOTELS)).isFalse();
        assertThat(provider.supports(ProviderCapability.ACTIVITIES)).isFalse();
        assertThat(provider.supports(ProviderCapability.TRANSFERS)).isFalse();
    }

    @Test
    @DisplayName("Unsupported products throw CAPABILITY_NOT_SUPPORTED")
    void unsupportedProducts_throwException() {
        assertThatThrownBy(() -> provider.searchFlights(null))
                .isInstanceOf(TravelProviderException.class)
                .extracting("errorCode").isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED);

        assertThatThrownBy(() -> provider.searchHotels(null))
                .isInstanceOf(TravelProviderException.class)
                .extracting("errorCode").isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED);

        assertThatThrownBy(() -> provider.searchActivities(null))
                .isInstanceOf(TravelProviderException.class)
                .extracting("errorCode").isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED);

        assertThatThrownBy(() -> provider.searchTransfers(null))
                .isInstanceOf(TravelProviderException.class)
                .extracting("errorCode").isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED);
    }

    @Test
    @DisplayName("getTrainStations deduplicates, normalizes, and sorts station list")
    void getTrainStations_normalizesAndSorts() {
        TransitlandModels.StopItem s1 = new TransitlandModels.StopItem();
        s1.setStopId("CASA_VOYAGEURS");
        s1.setOnestopId("s-evfx4s7cyn-casa~voyageurs");
        s1.setStopName("Casa-Voyageurs");

        TransitlandModels.StopItem s2 = new TransitlandModels.StopItem();
        s2.setStopId("RABAT_AGDAL");
        s2.setOnestopId("s-ey51knftzc-rabat~agdal");
        s2.setStopName("Rabat-Agdal");

        TransitlandModels.StopItem s3 = new TransitlandModels.StopItem();
        s3.setStopId("CASA_VOYAGEURS_DUP");
        s3.setOnestopId("s-evfx4s7cyn-casa~voyageurs~dup");
        s3.setStopName("Casa-Voyageurs"); // duplicate name

        when(client.getStops("f-oncf~morocco~rail")).thenReturn(List.of(s1, s2, s3));

        List<TrainStationDto> stations = provider.getTrainStations();

        assertThat(stations).hasSize(2);
        assertThat(stations.get(0).getName()).isEqualTo("Casa-Voyageurs");
        assertThat(stations.get(0).getCity()).isEqualTo("Casablanca");
        assertThat(stations.get(1).getName()).isEqualTo("Rabat-Agdal");
        assertThat(stations.get(1).getCity()).isEqualTo("Rabat");
    }

    @Test
    @DisplayName("Freshness gate blocks dates beyond feed calendar validity (e.g. 2026)")
    void freshnessGate_blocksDatesBeyondCalendarValidity() {
        TransitlandModels.FeedVersion version = new TransitlandModels.FeedVersion();
        version.setEarliestCalendarDate("2024-01-01");
        version.setLatestCalendarDate("2025-12-31");

        when(client.getFeedVersion("f-oncf~morocco~rail")).thenReturn(version);

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Marrakech")
                .date(LocalDate.parse("2026-09-25"))
                .build();

        assertThatThrownBy(() -> provider.searchTrains(query))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException te = (TravelProviderException) e;
                    assertThat(te.getErrorCode()).isEqualTo(ProviderErrorCode.SCHEDULE_DATA_OUTDATED);
                    assertThat(te.getMessage()).contains("2025-12-31");
                    assertThat(te.getMessage()).contains("https://www.oncf-voyages.ma");
                });
    }

    @Test
    @DisplayName("Valid calendar date returns offers with null price and explicit provenance")
    void validDate_returnsOffers_withNullPrice() {
        TransitlandModels.FeedVersion version = new TransitlandModels.FeedVersion();
        version.setEarliestCalendarDate("2024-01-01");
        version.setLatestCalendarDate("2025-12-31");
        when(client.getFeedVersion("f-oncf~morocco~rail")).thenReturn(version);

        TransitlandModels.StopItem sOrigin = new TransitlandModels.StopItem();
        sOrigin.setStopId("CASA_VOYAGEURS");
        sOrigin.setOnestopId("s-evfx4s7cyn-casa~voyageurs");
        sOrigin.setStopName("Casa-Voyageurs");

        TransitlandModels.StopItem sDest = new TransitlandModels.StopItem();
        sDest.setStopId("RABAT_AGDAL");
        sDest.setOnestopId("s-ey51knftzc-rabat~agdal");
        sDest.setStopName("Rabat-Agdal");

        when(client.getStops("f-oncf~morocco~rail")).thenReturn(List.of(sOrigin, sDest));

        TransitlandModels.RouteSummary route = new TransitlandModels.RouteSummary();
        route.setOnestopId("r-ey5-alboraq");
        route.setRouteShortName("Al Boraq");
        route.setRouteLongName("Al Boraq / Tanger - Casablanca (High Speed)");

        TransitlandModels.TripSummary trip = new TransitlandModels.TripSummary();
        trip.setId(1001L);
        trip.setTripId("BORAQ_1001");
        trip.setTripHeadsign("Tanger-Ville");
        trip.setRoute(route);

        TransitlandModels.DepartureItem dept = new TransitlandModels.DepartureItem();
        dept.setDepartureTime("08:00:00");
        dept.setTrip(trip);

        when(client.getStopDepartures(eq("s-evfx4s7cyn-casa~voyageurs"), any())).thenReturn(List.of(dept));

        TransitlandModels.StopTimeItem st1 = new TransitlandModels.StopTimeItem();
        st1.setStopSequence(1);
        st1.setDepartureTime("08:00:00");
        st1.setStop(sOrigin);

        TransitlandModels.StopTimeItem st2 = new TransitlandModels.StopTimeItem();
        st2.setStopSequence(2);
        st2.setArrivalTime("08:50:00");
        st2.setDepartureTime("08:52:00");
        st2.setStop(sDest);

        TransitlandModels.TripDetail detail = new TransitlandModels.TripDetail();
        detail.setId(1001L);
        detail.setTripId("BORAQ_1001");
        detail.setRoute(route);
        detail.setStopTimes(List.of(st1, st2));

        when(client.getTripDetail("r-ey5-alboraq", 1001L)).thenReturn(detail);

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Rabat-Agdal")
                .date(LocalDate.parse("2025-05-15"))
                .departureTime(LocalTime.parse("07:00"))
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);

        assertThat(offers).hasSize(1);
        TrainOfferDto offer = offers.getFirst();
        assertThat(offer.getTrainNumber()).isEqualTo("BORAQ_1001");
        assertThat(offer.getProductType()).isEqualTo("Al Boraq");
        assertThat(offer.getOriginStation()).isEqualTo("Casa-Voyageurs");
        assertThat(offer.getDestinationStation()).isEqualTo("Rabat-Agdal");
        assertThat(offer.getDepartureTime()).isEqualTo("08:00:00");
        assertThat(offer.getArrivalTime()).isEqualTo("08:50:00");
        assertThat(offer.getDurationMinutes()).isEqualTo(50);
        assertThat(offer.getPrice()).isNull(); // Strictly null - no fake price!
        assertThat(offer.getCurrency()).isEqualTo("MAD");
        assertThat(offer.getSource()).isEqualTo("TRANSITLAND_ONCF_GTFS");
        assertThat(offer.getOperator()).contains("ONCF");
        assertThat(offer.getOfficialScheduleUrl()).isEqualTo("https://www.oncf-voyages.ma");
    }

    @Test
    @DisplayName("Identical origin and destination station throws exception")
    void identicalStations_throwException() {
        TransitlandModels.FeedVersion version = new TransitlandModels.FeedVersion();
        version.setLatestCalendarDate("2025-12-31");
        when(client.getFeedVersion("f-oncf~morocco~rail")).thenReturn(version);

        TransitlandModels.StopItem sOrigin = new TransitlandModels.StopItem();
        sOrigin.setStopId("CASA_VOYAGEURS");
        sOrigin.setOnestopId("s-evfx4s7cyn-casa~voyageurs");
        sOrigin.setStopName("Casa-Voyageurs");

        when(client.getStops("f-oncf~morocco~rail")).thenReturn(List.of(sOrigin));

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Casa-Voyageurs")
                .date(LocalDate.parse("2025-05-15"))
                .build();

        assertThatThrownBy(() -> provider.searchTrains(query))
                .isInstanceOf(TravelProviderException.class)
                .extracting("errorCode").isEqualTo(ProviderErrorCode.PROVIDER_REQUEST_INVALID);
    }
}
