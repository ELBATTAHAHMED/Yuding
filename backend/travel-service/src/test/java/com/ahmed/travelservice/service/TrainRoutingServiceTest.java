package com.ahmed.travelservice.service;

import com.ahmed.travelservice.domain.query.TrainSearchQuery;
import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.dto.response.TrainStationDto;
import com.ahmed.travelservice.provider.impl.gtfs.OncfGtfsIndex;
import com.ahmed.travelservice.provider.impl.gtfs.OncfGtfsTrainProvider;
import com.ahmed.travelservice.provider.impl.transitous.TransitousTrainProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TrainRoutingServiceTest {

    @Mock
    private OncfGtfsTrainProvider oncfGtfsTrainProvider;

    @Mock
    private TransitousTrainProvider transitousTrainProvider;

    @Mock
    private OncfGtfsIndex oncfGtfsIndex;

    private TrainRoutingService routingService;

    @BeforeEach
    void setUp() {
        lenient().when(oncfGtfsTrainProvider.getGtfsIndex()).thenReturn(oncfGtfsIndex);
        routingService = new TrainRoutingService(oncfGtfsTrainProvider, transitousTrainProvider);
    }

    @Test
    @DisplayName("Morocco domestic route routes to ONCF GTFS provider as primary")
    void searchTrains_moroccoRoute_usesOncfProvider() {
        TrainStationDto casa = TrainStationDto.builder().id("200").name("Casa-Voyageurs").countryCode("MA").build();
        TrainStationDto rabat = TrainStationDto.builder().id("229").name("Rabat-Agdal").countryCode("MA").build();

        when(oncfGtfsIndex.isLoaded()).thenReturn(true);
        when(oncfGtfsIndex.resolveStation("Casa-Voyageurs")).thenReturn(casa);
        when(oncfGtfsIndex.resolveStation("Rabat-Agdal")).thenReturn(rabat);

        TrainOfferDto oncfOffer = TrainOfferDto.builder()
                .offerId("oncf-1")
                .provider("ONCF_GTFS")
                .productType("Al Boraq")
                .originStation("Casa-Voyageurs")
                .destinationStation("Rabat-Agdal")
                .build();

        when(oncfGtfsTrainProvider.searchTrains(any(TrainSearchQuery.class)))
                .thenReturn(List.of(oncfOffer));

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Rabat-Agdal")
                .date(LocalDate.of(2026, 9, 22))
                .build();

        List<TrainOfferDto> results = routingService.searchTrains(query);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getProvider()).isEqualTo("ONCF_GTFS");
        verify(oncfGtfsTrainProvider).searchTrains(query);
        verify(transitousTrainProvider, never()).searchTrains(any());
    }

    @Test
    @DisplayName("International European route (Paris -> Lyon) routes to Transitous provider")
    void searchTrains_internationalRoute_usesTransitousProvider() {
        when(oncfGtfsIndex.isLoaded()).thenReturn(true);
        when(oncfGtfsIndex.resolveStation("Paris Gare de Lyon")).thenReturn(null);

        TrainOfferDto transitousOffer = TrainOfferDto.builder()
                .offerId("trans-1")
                .provider("TRANSITOUS")
                .productType("TGV")
                .originStation("Paris Gare de Lyon")
                .destinationStation("Lyon Part-Dieu")
                .build();

        when(transitousTrainProvider.searchTrains(any(TrainSearchQuery.class)))
                .thenReturn(List.of(transitousOffer));

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Paris Gare de Lyon")
                .destinationStation("Lyon Part-Dieu")
                .date(LocalDate.of(2026, 9, 22))
                .build();

        List<TrainOfferDto> results = routingService.searchTrains(query);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getProvider()).isEqualTo("TRANSITOUS");
        verify(transitousTrainProvider).searchTrains(query);
        verify(oncfGtfsTrainProvider, never()).searchTrains(any());
    }

    @Test
    @DisplayName("Spanish route (Madrid -> Barcelona) routes to Transitous provider")
    void searchTrains_spanishRoute_usesTransitousProvider() {
        when(oncfGtfsIndex.isLoaded()).thenReturn(true);
        when(oncfGtfsIndex.resolveStation("Madrid Puerta de Atocha")).thenReturn(null);

        TrainOfferDto aveOffer = TrainOfferDto.builder()
                .offerId("ave-1")
                .provider("TRANSITOUS")
                .productType("AVE")
                .originStation("Madrid Puerta de Atocha")
                .destinationStation("Barcelona Sants")
                .build();

        when(transitousTrainProvider.searchTrains(any(TrainSearchQuery.class)))
                .thenReturn(List.of(aveOffer));

        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Madrid Puerta de Atocha")
                .destinationStation("Barcelona Sants")
                .date(LocalDate.of(2026, 9, 22))
                .build();

        List<TrainOfferDto> results = routingService.searchTrains(query);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getProvider()).isEqualTo("TRANSITOUS");
        verify(transitousTrainProvider).searchTrains(query);
        verify(oncfGtfsTrainProvider, never()).searchTrains(any());
    }

    @Test
    @DisplayName("searchStations merges local ONCF matches with global Transitous places without duplicate Moroccan stations")
    void searchStations_mergesLocalAndGlobalWithoutDuplicates() {
        TrainStationDto oncfCasa = TrainStationDto.builder()
                .id("200")
                .name("Casa-Voyageurs")
                .city("Casablanca")
                .country("Maroc")
                .countryCode("MA")
                .provider("ONCF_GTFS")
                .build();

        when(oncfGtfsTrainProvider.getTrainStations()).thenReturn(List.of(oncfCasa));

        TrainStationDto globalCasa = TrainStationDto.builder()
                .id("node/123")
                .name("Casa-Voyageurs")
                .city("Casablanca")
                .country("Morocco")
                .countryCode("MA")
                .provider("TRANSITOUS")
                .build();

        TrainStationDto globalParis = TrainStationDto.builder()
                .id("node/456")
                .name("Paris Gare de Lyon")
                .city("Paris")
                .country("France")
                .countryCode("FR")
                .provider("TRANSITOUS")
                .build();

        when(transitousTrainProvider.searchStations("Casa")).thenReturn(List.of(globalCasa, globalParis));

        List<TrainStationDto> results = routingService.searchStations("Casa");

        // Should contain ONCF Casa and global Paris, but NOT the duplicate global Casa
        assertThat(results).hasSize(2);
        assertThat(results.get(0).getProvider()).isEqualTo("ONCF_GTFS");
        assertThat(results.get(0).getName()).isEqualTo("Casa-Voyageurs");
        assertThat(results.get(1).getProvider()).isEqualTo("TRANSITOUS");
        assertThat(results.get(1).getName()).isEqualTo("Paris Gare de Lyon");
    }
}
