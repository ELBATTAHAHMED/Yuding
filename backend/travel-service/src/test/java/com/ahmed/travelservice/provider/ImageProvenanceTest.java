package com.ahmed.travelservice.provider;

import com.ahmed.travelservice.domain.query.ActivitySearchQuery;
import com.ahmed.travelservice.domain.query.HotelSearchQuery;
import com.ahmed.travelservice.dto.image.ImageRole;
import com.ahmed.travelservice.dto.image.ImageSourceType;
import com.ahmed.travelservice.dto.response.ActivityOfferDto;
import com.ahmed.travelservice.dto.response.HotelOfferDto;
import com.ahmed.travelservice.provider.impl.hbx.HBXActivitiesClient;
import com.ahmed.travelservice.provider.impl.hbx.HBXTransfersClient;
import com.ahmed.travelservice.provider.impl.hbx.HBXTravelProvider;
import com.ahmed.travelservice.provider.impl.hbx.dto.activities.HBXActivitySearchResponse;
import com.ahmed.travelservice.provider.impl.nuitee.NuiteeClient;
import com.ahmed.travelservice.provider.impl.nuitee.NuiteeTravelProvider;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeHotelData;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeHotelRatesData;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteePriceItem;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeRate;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeRatesResponse;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeRetailRate;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeRoomType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ImageProvenanceTest {

    @Mock
    private NuiteeClient nuiteeClient;

    @Mock
    private HBXActivitiesClient hbxActivitiesClient;

    @Mock
    private HBXTransfersClient hbxTransfersClient;

    @Test
    @DisplayName("Nuitee hotel with provider image sets PROVIDER_ENTITY and representsEntity=true")
    void nuiteeHotel_withImage_setsProviderEntity() {
        NuiteeTravelProvider provider = new NuiteeTravelProvider(nuiteeClient);

        NuiteeHotelRatesData rateData = NuiteeHotelRatesData.builder()
                .hotelId("lp100")
                .roomTypes(List.of(
                        NuiteeRoomType.builder()
                                .roomTypeId("rt1")
                                .rates(List.of(
                                        NuiteeRate.builder()
                                                .rateId("r1")
                                                .retailRate(NuiteeRetailRate.builder()
                                                        .total(List.of(NuiteePriceItem.builder().amount(BigDecimal.valueOf(150.00)).currency("EUR").build()))
                                                        .build())
                                                .build()
                                ))
                                .build()
                ))
                .build();

        NuiteeHotelData hotelMeta = NuiteeHotelData.builder()
                .id("lp100")
                .name("Hotel Atlas Marrakech")
                .mainPhoto("https://media.liteapi.travel/hotel/lp100/main.jpg")
                .cityName("Marrakech")
                .countryCode("MA")
                .build();

        NuiteeRatesResponse ratesResponse = NuiteeRatesResponse.builder()
                .data(List.of(rateData))
                .hotels(List.of(hotelMeta))
                .build();

        when(nuiteeClient.searchHotelRates(any())).thenReturn(ratesResponse);

        HotelSearchQuery query = HotelSearchQuery.builder()
                .destination("Marrakech")
                .checkIn(LocalDate.now().plusDays(5))
                .checkOut(LocalDate.now().plusDays(8))
                .build();

        List<HotelOfferDto> offers = provider.searchHotels(query);

        assertThat(offers).hasSize(1);
        HotelOfferDto hotel = offers.get(0);
        assertThat(hotel.getImageUrl()).isEqualTo("https://media.liteapi.travel/hotel/lp100/main.jpg");
        assertThat(hotel.getImageAsset()).isNotNull();
        assertThat(hotel.getImageAsset().getSourceType()).isEqualTo(ImageSourceType.PROVIDER_ENTITY);
        assertThat(hotel.getImageAsset().getSourceProvider()).isEqualTo("NUITEE");
        assertThat(hotel.getImageAsset().isRepresentsEntity()).isTrue();
        assertThat(hotel.getImageAsset().getRole()).isEqualTo(ImageRole.HOTEL);
    }

    @Test
    @DisplayName("Nuitee hotel without provider image sets PLACEHOLDER and representsEntity=false (never stock fallback)")
    void nuiteeHotel_withoutImage_setsPlaceholder() {
        NuiteeTravelProvider provider = new NuiteeTravelProvider(nuiteeClient);

        NuiteeHotelRatesData rateData = NuiteeHotelRatesData.builder()
                .hotelId("lp200")
                .roomTypes(List.of(
                        NuiteeRoomType.builder()
                                .roomTypeId("rt1")
                                .rates(List.of(
                                        NuiteeRate.builder()
                                                .rateId("r1")
                                                .retailRate(NuiteeRetailRate.builder()
                                                        .total(List.of(NuiteePriceItem.builder().amount(BigDecimal.valueOf(100.00)).currency("EUR").build()))
                                                        .build())
                                                .build()
                                ))
                                .build()
                ))
                .build();

        NuiteeHotelData hotelMeta = NuiteeHotelData.builder()
                .id("lp200")
                .name("Riad Unpictured")
                .mainPhoto(null)
                .thumbnail(null)
                .cityName("Marrakech")
                .countryCode("MA")
                .build();

        NuiteeRatesResponse ratesResponse = NuiteeRatesResponse.builder()
                .data(List.of(rateData))
                .hotels(List.of(hotelMeta))
                .build();

        when(nuiteeClient.searchHotelRates(any())).thenReturn(ratesResponse);

        HotelSearchQuery query = HotelSearchQuery.builder()
                .destination("Marrakech")
                .checkIn(LocalDate.now().plusDays(5))
                .checkOut(LocalDate.now().plusDays(8))
                .build();

        List<HotelOfferDto> offers = provider.searchHotels(query);

        assertThat(offers).hasSize(1);
        HotelOfferDto hotel = offers.get(0);
        assertThat(hotel.getImageUrl()).isNull();
        assertThat(hotel.getImageAsset()).isNotNull();
        assertThat(hotel.getImageAsset().getSourceType()).isEqualTo(ImageSourceType.PLACEHOLDER);
        assertThat(hotel.getImageAsset().isRepresentsEntity()).isFalse();
    }

    @Test
    @DisplayName("HBX activity with image sets PROVIDER_ENTITY, and without image sets PLACEHOLDER")
    void hbxActivity_provenance_truthEnforced() {
        HBXTravelProvider provider = new HBXTravelProvider(hbxActivitiesClient, hbxTransfersClient);

        HBXActivitySearchResponse.HBXActivity actWithImg = new HBXActivitySearchResponse.HBXActivity();
        actWithImg.setCode("ACT-1");
        actWithImg.setName("Excursion Atlas");
        HBXActivitySearchResponse.Content c1 = new HBXActivitySearchResponse.Content();
        HBXActivitySearchResponse.Media m1 = new HBXActivitySearchResponse.Media();
        HBXActivitySearchResponse.Image img1 = new HBXActivitySearchResponse.Image();
        HBXActivitySearchResponse.ImageUrl u1 = new HBXActivitySearchResponse.ImageUrl();
        u1.setResource("https://photos.hotelbeds.com/atlas.jpg");
        img1.setUrls(List.of(u1));
        m1.setImages(List.of(img1));
        c1.setMedia(m1);
        actWithImg.setContent(c1);

        HBXActivitySearchResponse.HBXActivity actNoImg = new HBXActivitySearchResponse.HBXActivity();
        actNoImg.setCode("ACT-2");
        actNoImg.setName("Visite Souks");

        HBXActivitySearchResponse resp = new HBXActivitySearchResponse();
        resp.setActivities(List.of(actWithImg, actNoImg));

        when(hbxActivitiesClient.searchActivities(any())).thenReturn(resp);

        ActivitySearchQuery query = ActivitySearchQuery.builder()
                .destination("Marrakech")
                .build();

        List<ActivityOfferDto> offers = provider.searchActivities(query);

        assertThat(offers).hasSize(2);

        // Activity 1 has HBX provider image
        ActivityOfferDto o1 = offers.get(0);
        assertThat(o1.getImageUrl()).isEqualTo("https://photos.hotelbeds.com/atlas.jpg");
        assertThat(o1.getImageAsset().getSourceType()).isEqualTo(ImageSourceType.PROVIDER_ENTITY);
        assertThat(o1.getImageAsset().getSourceProvider()).isEqualTo("HBX");
        assertThat(o1.getImageAsset().isRepresentsEntity()).isTrue();

        // Activity 2 has no image -> neutral placeholder (NOT a stock image!)
        ActivityOfferDto o2 = offers.get(1);
        assertThat(o2.getImageUrl()).isNull();
        assertThat(o2.getImageAsset().getSourceType()).isEqualTo(ImageSourceType.PLACEHOLDER);
        assertThat(o2.getImageAsset().isRepresentsEntity()).isFalse();
    }

    @Test
    @DisplayName("Curated Yuding activities carry YUDING_CURATED provenance and representsEntity=true")
    void curatedYudingActivities_provenanceEnforced() {
        HBXTravelProvider provider = new HBXTravelProvider(hbxActivitiesClient, hbxTransfersClient);

        HBXActivitySearchResponse emptyResp = new HBXActivitySearchResponse();
        emptyResp.setActivities(List.of());
        when(hbxActivitiesClient.searchActivities(any())).thenReturn(emptyResp);

        ActivitySearchQuery query = ActivitySearchQuery.builder()
                .destination("Marrakech")
                .build();

        List<ActivityOfferDto> offers = provider.searchActivities(query);

        assertThat(offers).hasSize(2);
        for (ActivityOfferDto offer : offers) {
            assertThat(offer.getSource()).isEqualTo("YUDING_CUSTOM");
            assertThat(offer.getImageAsset()).isNotNull();
            assertThat(offer.getImageAsset().getSourceType()).isEqualTo(ImageSourceType.YUDING_CURATED);
            assertThat(offer.getImageAsset().getSourceProvider()).isEqualTo("YUDING");
            assertThat(offer.getImageAsset().isRepresentsEntity()).isTrue();
        }
    }
}
