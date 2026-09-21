package com.ahmed.travelservice.provider.hbx;

import com.ahmed.travelservice.domain.query.ActivitySearchQuery;
import com.ahmed.travelservice.domain.query.TransferSearchQuery;
import com.ahmed.travelservice.dto.response.ActivityOfferDto;
import com.ahmed.travelservice.dto.response.TransferOfferDto;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.hbx.HBXActivitiesClient;
import com.ahmed.travelservice.provider.impl.hbx.HBXTransfersClient;
import com.ahmed.travelservice.provider.impl.hbx.HBXTravelProvider;
import com.ahmed.travelservice.provider.impl.hbx.dto.activities.HBXActivitySearchResponse;
import com.ahmed.travelservice.provider.impl.hbx.dto.transfers.HBXTransferAvailabilityResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HBXTravelProviderTest {

    @Mock
    private HBXActivitiesClient activitiesClient;

    @Mock
    private HBXTransfersClient transfersClient;

    private HBXTravelProvider provider;

    @BeforeEach
    void setUp() {
        provider = new HBXTravelProvider(activitiesClient, transfersClient);
    }

    @Test
    @DisplayName("Metadata reports correct code and supported capabilities")
    void metadata_reportsCorrectCapabilities() {
        assertThat(provider.getMetadata().getProviderCode()).isEqualTo("HBX");
        assertThat(provider.supports(ProviderCapability.ACTIVITIES)).isTrue();
        assertThat(provider.supports(ProviderCapability.TRANSFERS)).isTrue();
        assertThat(provider.supports(ProviderCapability.FLIGHTS)).isFalse();
        assertThat(provider.supports(ProviderCapability.HOTELS)).isFalse();
    }

    @Test
    @DisplayName("searchFlights and searchHotels throw capabilityNotSupported")
    void unsupportedProducts_throwException() {
        assertThatThrownBy(() -> provider.searchFlights(null))
                .isInstanceOf(TravelProviderException.class);
        assertThatThrownBy(() -> provider.searchHotels(null))
                .isInstanceOf(TravelProviderException.class);
        assertThatThrownBy(() -> provider.revalidateOffer(null))
                .isInstanceOf(TravelProviderException.class);
    }

    @Test
    @DisplayName("searchActivities normalizes HBX activity response with source=HBX")
    void searchActivities_normalizesResponse_withHBXSource() throws Exception {
        HBXActivitySearchResponse.HBXActivity act = new HBXActivitySearchResponse.HBXActivity();
        act.setCode("ACT-1");
        act.setName("Balade Quad Palmeraie");
        act.setType("AVENTURE");
        act.setCurrency("EUR");

        HBXActivitySearchResponse.AmountFrom af = new HBXActivitySearchResponse.AmountFrom();
        af.setAmount(BigDecimal.valueOf(40.00));
        act.setAmountsFrom(List.of(af));

        HBXActivitySearchResponse response = new HBXActivitySearchResponse();
        response.setActivities(List.of(act));

        when(activitiesClient.searchActivities(any())).thenReturn(response);

        ActivitySearchQuery query = ActivitySearchQuery.builder()
                .destination("Marrakech")
                .date(LocalDate.now().plusDays(2))
                .travelers(2)
                .build();

        List<ActivityOfferDto> offers = provider.searchActivities(query);

        assertThat(offers).hasSize(1);
        ActivityOfferDto dto = offers.get(0);
        assertThat(dto.getOfferId()).isEqualTo("HBX-ACT-1");
        assertThat(dto.getProvider()).isEqualTo("HBX");
        assertThat(dto.getSource()).isEqualTo("HBX");
        assertThat(dto.getTitle()).isEqualTo("Balade Quad Palmeraie");
        assertThat(dto.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(40.00));
    }

    @Test
    @DisplayName("searchActivities supplies YUDING_CUSTOM fallback with explicit provenance when empty for Marrakech")
    void searchActivities_emptyMorocco_returnsYudingCustomOffers() throws Exception {
        HBXActivitySearchResponse emptyResponse = new HBXActivitySearchResponse();
        emptyResponse.setActivities(List.of());

        when(activitiesClient.searchActivities(any())).thenReturn(emptyResponse);

        ActivitySearchQuery query = ActivitySearchQuery.builder()
                .destination("Marrakech")
                .date(LocalDate.now().plusDays(2))
                .build();

        List<ActivityOfferDto> offers = provider.searchActivities(query);

        assertThat(offers).isNotEmpty();
        for (ActivityOfferDto dto : offers) {
            assertThat(dto.getSource()).isEqualTo("YUDING_CUSTOM");
            assertThat(dto.getProvider()).isEqualTo("HBX");
            assertThat(dto.getPrice()).isNotNull();
            assertThat(dto.getDestination()).isEqualTo("Marrakech");
            assertThat(dto.getTitle()).doesNotContain("("); // No dynamic string interpolation
        }
    }

    @Test
    @DisplayName("searchActivities returns clean empty list for non-curated destination when HBX has zero results")
    void searchActivities_emptyGlobal_returnsCleanEmptyList() throws Exception {
        HBXActivitySearchResponse emptyResponse = new HBXActivitySearchResponse();
        emptyResponse.setActivities(List.of());

        when(activitiesClient.searchActivities(any())).thenReturn(emptyResponse);

        ActivitySearchQuery query = ActivitySearchQuery.builder()
                .destination("Paris")
                .date(LocalDate.now().plusDays(2))
                .build();

        List<ActivityOfferDto> offers = provider.searchActivities(query);

        assertThat(offers).isEmpty();
    }

    @Test
    @DisplayName("searchTransfers normalizes HBX transfer services into TransferOfferDto")
    void searchTransfers_normalizesResponseCorrectly() throws Exception {
        HBXTransferAvailabilityResponse.TransferService svc = new HBXTransferAvailabilityResponse.TransferService();
        svc.setRateKey("RK-TRF-001");
        svc.setTransferType("PRIVATE");

        HBXTransferAvailabilityResponse.Vehicle v = new HBXTransferAvailabilityResponse.Vehicle();
        v.setName("Mercedes Minivan");
        svc.setVehicle(v);

        HBXTransferAvailabilityResponse.Price p = new HBXTransferAvailabilityResponse.Price();
        p.setTotalAmount(BigDecimal.valueOf(45.00));
        p.setCurrencyId("EUR");
        svc.setPrice(p);

        svc.setMaxPaxCapacity(6);

        HBXTransferAvailabilityResponse response = new HBXTransferAvailabilityResponse();
        response.setServices(List.of(svc));

        when(transfersClient.searchTransfers(any(), any(), any(), any(), any(), any(), any(), any(int.class), any(int.class), any(int.class)))
                .thenReturn(response);

        TransferSearchQuery query = TransferSearchQuery.builder()
                .pickup("RAK")
                .dropoff("Marrakech")
                .date(LocalDate.now().plusDays(3))
                .time(LocalTime.of(10, 0))
                .passengers(3)
                .build();

        List<TransferOfferDto> offers = provider.searchTransfers(query);

        assertThat(offers).hasSize(1);
        TransferOfferDto dto = offers.get(0);
        assertThat(dto.getOfferId()).isEqualTo("RK-TRF-001");
        assertThat(dto.getProvider()).isEqualTo("HBX");
        assertThat(dto.getTransferType()).isEqualTo("PRIVATE");
        assertThat(dto.getVehicleModel()).isEqualTo("Mercedes Minivan");
        assertThat(dto.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(45.00));
        assertThat(dto.getCapacity()).isEqualTo(6);
    }
}
