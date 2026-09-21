package com.ahmed.travelservice.provider.transitous;

import com.ahmed.travelservice.domain.query.TrainSearchQuery;
import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.dto.response.TrainStationDto;
import com.ahmed.travelservice.provider.impl.transitous.TransitousClient;
import com.ahmed.travelservice.provider.impl.transitous.TransitousTrainProvider;
import com.ahmed.travelservice.provider.impl.transitous.model.TransitousModels.*;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TransitousTrainProviderTest {

    @Mock
    private TransitousClient client;

    private TransitousTrainProvider provider;

    @BeforeEach
    void setUp() {
        provider = new TransitousTrainProvider(client);
    }

    @Test
    @DisplayName("searchTrains maps direct high-speed rail itinerary with price null and legs")
    void searchTrains_mapsDirectRailItinerary() {
        StopPlace paris = StopPlace.builder().name("Paris Gare de Lyon").lat(48.84484).lon(2.37406).build();
        StopPlace lyon = StopPlace.builder().name("Lyon Part-Dieu").lat(45.7604).lon(4.8596).build();

        Leg tgvLeg = Leg.builder()
                .mode("HIGHSPEED_RAIL")
                .agencyName("SNCF Voyageurs")
                .agencyUrl("https://www.sncf-connect.com")
                .displayName("TGV INOUI 6605")
                .from(paris)
                .to(lyon)
                .startTime("2026-09-22T08:00:00Z")
                .endTime("2026-09-22T10:00:00Z")
                .duration(7200L)
                .realTime(true)
                .build();

        Itinerary itinerary = Itinerary.builder()
                .duration(7200L)
                .startTime("2026-09-22T08:00:00Z")
                .endTime("2026-09-22T10:00:00Z")
                .transfers(0)
                .legs(List.of(tgvLeg))
                .build();

        PlanResponse planResponse = PlanResponse.builder()
                .itineraries(List.of(itinerary))
                .build();

        when(client.plan(anyString(), anyString(), anyString(), anyInt(), anyString()))
                .thenReturn(planResponse);

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Paris Gare de Lyon")
                .originCoordinates("48.84484,2.37406")
                .destinationStation("Lyon Part-Dieu")
                .destinationCoordinates("45.7604,4.8596")
                .date(LocalDate.of(2026, 9, 22))
                .departureTime(LocalTime.of(8, 0))
                .currency("EUR")
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);

        assertThat(offers).hasSize(1);
        TrainOfferDto offer = offers.get(0);

        assertThat(offer.getProvider()).isEqualTo("TRANSITOUS");
        assertThat(offer.getSource()).isEqualTo("TRANSITOUS");
        assertThat(offer.getOperator()).isEqualTo("SNCF Voyageurs");
        assertThat(offer.getTrainNumber()).isEqualTo("TGV INOUI 6605");
        assertThat(offer.getOriginStation()).isEqualTo("Paris Gare de Lyon");
        assertThat(offer.getDestinationStation()).isEqualTo("Lyon Part-Dieu");
        assertThat(offer.getDepartureTime()).isEqualTo("08:00");
        assertThat(offer.getArrivalTime()).isEqualTo("10:00");
        assertThat(offer.getDurationMinutes()).isEqualTo(120);
        assertThat(offer.isDirect()).isTrue();
        assertThat(offer.getNumberOfTransfers()).isEqualTo(0);
        assertThat(offer.getPrice()).isNull(); // Zero fake price principle!
        assertThat(offer.getCurrency()).isEqualTo("EUR");
        assertThat(offer.getOfficialScheduleUrl()).isEqualTo("https://www.sncf-connect.com");
        assertThat(offer.getLegs()).hasSize(1);
        assertThat(offer.getLegs().get(0).isRealTime()).isTrue();
    }

    @Test
    @DisplayName("searchTrains maps connecting journey with multiple transfers")
    void searchTrains_mapsConnectingJourney() {
        StopPlace madrid = StopPlace.builder().name("Madrid Puerta de Atocha").build();
        StopPlace zaragoza = StopPlace.builder().name("Zaragoza-Delicias").build();
        StopPlace barcelona = StopPlace.builder().name("Barcelona Sants").build();

        Leg leg1 = Leg.builder()
                .mode("HIGHSPEED_RAIL")
                .agencyName("Renfe")
                .displayName("AVE 3081")
                .from(madrid)
                .to(zaragoza)
                .startTime("2026-09-22T09:00:00Z")
                .endTime("2026-09-22T10:20:00Z")
                .duration(4800L)
                .build();

        Leg leg2 = Leg.builder()
                .mode("HIGHSPEED_RAIL")
                .agencyName("Iryo")
                .displayName("Iryo 6100")
                .from(zaragoza)
                .to(barcelona)
                .startTime("2026-09-22T10:50:00Z")
                .endTime("2026-09-22T12:15:00Z")
                .duration(5100L)
                .build();

        Itinerary itinerary = Itinerary.builder()
                .duration(11700L)
                .startTime("2026-09-22T09:00:00Z")
                .endTime("2026-09-22T12:15:00Z")
                .transfers(1)
                .legs(List.of(leg1, leg2))
                .build();

        when(client.plan(anyString(), anyString(), anyString(), anyInt(), anyString()))
                .thenReturn(PlanResponse.builder().itineraries(List.of(itinerary)).build());

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Madrid Puerta de Atocha")
                .originCoordinates("40.4065,-3.6896")
                .destinationStation("Barcelona Sants")
                .destinationCoordinates("41.3792,2.1401")
                .date(LocalDate.of(2026, 9, 22))
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);

        assertThat(offers).hasSize(1);
        TrainOfferDto offer = offers.get(0);

        assertThat(offer.isDirect()).isFalse();
        assertThat(offer.getNumberOfTransfers()).isEqualTo(1);
        assertThat(offer.getLegs()).hasSize(2);
        assertThat(offer.getLegs().get(0).getOperator()).isEqualTo("Renfe");
        assertThat(offer.getLegs().get(1).getOperator()).isEqualTo("Iryo");
        assertThat(offer.getPrice()).isNull();
    }

    @Test
    @DisplayName("searchTrains filters out walk-only itineraries in train vertical")
    void searchTrains_filtersWalkOnlyItineraries() {
        Leg walkLeg = Leg.builder()
                .mode("WALK")
                .duration(1800L)
                .build();

        Itinerary walkOnly = Itinerary.builder()
                .duration(1800L)
                .legs(List.of(walkLeg))
                .build();

        when(client.plan(anyString(), anyString(), anyString(), anyInt(), anyString()))
                .thenReturn(PlanResponse.builder().itineraries(List.of(walkOnly)).build());

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("48.85,2.35")
                .destinationStation("48.86,2.36")
                .date(LocalDate.of(2026, 9, 22))
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);
        assertThat(offers).isEmpty();
    }

    @Test
    @DisplayName("searchStations maps Transitous geocode results to TrainStationDto")
    void searchStations_mapsGeocodeResults() {
        Area france = Area.builder().name("France").adminLevel(2.0).build();
        Area paris = Area.builder().name("Paris").adminLevel(8.0).build();

        GeocodeResult gr = GeocodeResult.builder()
                .type("STOP")
                .name("Paris Gare de Lyon")
                .id("ch-8768600")
                .lat(48.84484)
                .lon(2.37406)
                .country("FR")
                .areas(List.of(france, paris))
                .tz("Europe/Paris")
                .build();

        when(client.geocode("Paris", "fr")).thenReturn(List.of(gr));

        List<TrainStationDto> stations = provider.searchStations("Paris");

        assertThat(stations).hasSize(1);
        TrainStationDto station = stations.get(0);
        assertThat(station.getName()).isEqualTo("Paris Gare de Lyon");
        assertThat(station.getCity()).isEqualTo("Paris");
        assertThat(station.getCountry()).isEqualTo("France");
        assertThat(station.getCountryCode()).isEqualTo("FR");
        assertThat(station.getProvider()).isEqualTo("TRANSITOUS");
        assertThat(station.getLocationType()).isEqualTo("STOP");
    }
}
