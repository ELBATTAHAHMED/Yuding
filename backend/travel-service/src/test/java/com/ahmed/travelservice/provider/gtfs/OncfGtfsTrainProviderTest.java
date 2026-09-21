package com.ahmed.travelservice.provider.gtfs;

import com.ahmed.travelservice.config.OncfGtfsProperties;
import com.ahmed.travelservice.domain.query.TrainSearchQuery;
import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.dto.response.TrainStationDto;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.gtfs.OncfGtfsTrainProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("ONCF GTFS Train Provider Unit Tests")
class OncfGtfsTrainProviderTest {

    private OncfGtfsTrainProvider provider;

    @BeforeEach
    void setUp() {
        File fixtureDir = new File("src/test/resources/gtfs-test-fixture");
        if (!fixtureDir.exists()) {
            fixtureDir = new File("backend/travel-service/src/test/resources/gtfs-test-fixture");
        }

        OncfGtfsProperties properties = new OncfGtfsProperties();
        properties.setDataPath(fixtureDir.getAbsolutePath());
        properties.setEnabled(true);

        provider = new OncfGtfsTrainProvider(properties);
        provider.init();
    }

    @Test
    @DisplayName("Loads fixture stations and normalizes parent station names")
    void testStationLoadingAndNormalization() {
        List<TrainStationDto> stations = provider.getTrainStations();
        assertThat(stations).isNotEmpty();
        assertThat(stations).hasSize(5); // Casa Voyageurs, Rabat Agdal, Kénitra, Tanger Ville, Marrakech

        // Check Casa-Voyageurs resolution
        TrainStationDto casa = provider.getGtfsIndex().resolveStation("Casa-Voyageurs");
        assertThat(casa).isNotNull();
        assertThat(casa.getId()).isEqualTo("200");
        assertThat(casa.getName()).isEqualTo("Casa-Voyageurs");
        assertThat(casa.getCity()).isEqualTo("Casablanca");

        // Check accent and punctuation insensitivity
        TrainStationDto kenitra = provider.getGtfsIndex().resolveStation("kenitra");
        assertThat(kenitra).isNotNull();
        assertThat(kenitra.getId()).isEqualTo("250");
        assertThat(kenitra.getName()).isEqualTo("Kénitra");
    }

    @Test
    @DisplayName("Searches valid 2026 Al Boraq trains between Casa and Tanger")
    void testSearchTrains2026AlBoraq() {
        // Wednesday 2026-09-23
        LocalDate date = LocalDate.of(2026, 9, 23);
        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Tanger-Ville")
                .date(date)
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);
        assertThat(offers).isNotEmpty();

        TrainOfferDto first = offers.get(0);
        assertThat(first.getOfferId()).startsWith("train-TRIP_BORAQ_0800");
        assertThat(first.getProvider()).isEqualTo("ONCF_GTFS");
        assertThat(first.getSource()).isEqualTo("ONCF_GTFS_COMMUNITY");
        assertThat(first.getProductType()).isEqualTo("Al Boraq");
        assertThat(first.getDepartureTime()).isEqualTo("08:00:00");
        assertThat(first.getArrivalTime()).isEqualTo("10:10:00");
        assertThat(first.getDurationMinutes()).isEqualTo(130);
        assertThat(first.isDirect()).isFalse();
        assertThat(first.getStopsCount()).isEqualTo(2); // Rabat-Agdal, Kénitra
        assertThat(first.getIntermediateStops()).hasSize(2);

        // Price is strictly null
        assertThat(first.getPrice()).isNull();
        assertThat(first.getCurrency()).isEqualTo("MAD");
        assertThat(first.getOfficialScheduleUrl()).isEqualTo("https://www.oncf-voyages.ma");
    }

    @Test
    @DisplayName("Applies calendar_dates.txt exception additions (exception_type=1)")
    void testCalendarDateAdditionException() {
        // Tuesday 2026-09-22 has exception adding SPECIAL service
        LocalDate date = LocalDate.of(2026, 9, 22);
        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Tanger-Ville")
                .date(date)
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);
        boolean hasSpecialTrip = offers.stream()
                .anyMatch(o -> o.getOfferId().contains("TRIP_BORAQ_SPECIAL"));
        assertThat(hasSpecialTrip).isTrue();
    }

    @Test
    @DisplayName("Applies calendar_dates.txt exception removals (exception_type=2)")
    void testCalendarDateRemovalException() {
        // Tuesday 2026-09-22 has exception removing WEEKDAY service
        LocalDate date = LocalDate.of(2026, 9, 22);
        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Tanger-Ville")
                .date(date)
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);
        boolean hasWeekdayTrip = offers.stream()
                .anyMatch(o -> o.getOfferId().contains("TRIP_BORAQ_WEEKDAY"));
        assertThat(hasWeekdayTrip).isFalse();
    }

    @Test
    @DisplayName("Handles GTFS >24:00 times correctly without exception (Overnight trips)")
    void testOvernightGtfsTimeHandling() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Marrakech")
                .date(date)
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);
        assertThat(offers).hasSize(1);

        TrainOfferDto overnight = offers.get(0);
        assertThat(overnight.getDepartureTime()).isEqualTo("23:30:00");
        // 25:15:00 wraps to 01:15:00
        assertThat(overnight.getArrivalTime()).isEqualTo("01:15:00");
        // 25:15 - 23:30 = 1h45m = 105 minutes
        assertThat(overnight.getDurationMinutes()).isEqualTo(105);
    }

    @Test
    @DisplayName("Filters results by departure time")
    void testDepartureTimeFilter() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Tanger-Ville")
                .date(date)
                .departureTime(LocalTime.of(10, 0))
                .build();

        List<TrainOfferDto> offers = provider.searchTrains(query);
        // TRIP_BORAQ_0800 departs at 08:00, so it must be excluded
        boolean has0800 = offers.stream().anyMatch(o -> "08:00:00".equals(o.getDepartureTime()));
        assertThat(has0800).isFalse();
    }

    @Test
    @DisplayName("Freshness gate rejects dates outside dataset calendar window")
    void testFreshnessGateRejection() {
        LocalDate futureDate = LocalDate.of(2030, 1, 1);
        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Tanger-Ville")
                .date(futureDate)
                .build();

        assertThatThrownBy(() -> provider.searchTrains(query))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException ex = (TravelProviderException) e;
                    assertThat(ex.getErrorCode()).isEqualTo(ProviderErrorCode.SCHEDULE_DATA_OUTDATED);
                    assertThat(ex.getMessage()).contains("Current timetable data is not available");
                });
    }

    @Test
    @DisplayName("Rejects same origin and destination stations")
    void testSameOriginAndDestination() {
        LocalDate date = LocalDate.of(2026, 9, 23);
        TrainSearchQuery query = TrainSearchQuery.builder()
                .originStation("Casa-Voyageurs")
                .destinationStation("Casa-Voyageurs")
                .date(date)
                .build();

        assertThatThrownBy(() -> provider.searchTrains(query))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException ex = (TravelProviderException) e;
                    assertThat(ex.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_REQUEST_INVALID);
                });
    }

    @Test
    @DisplayName("Metadata indicates provider code ONCF_GTFS and TRAINS capability")
    void testProviderMetadata() {
        assertThat(provider.getMetadata().getProviderCode()).isEqualTo("ONCF_GTFS");
        assertThat(provider.supports(ProviderCapability.TRAINS)).isTrue();
        assertThat(provider.supports(ProviderCapability.FLIGHTS)).isFalse();
    }
}
