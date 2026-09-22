package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.query.ActivitySearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.ActivityOfferDto;
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
class ActivityOfferRevalidatorTest {

    @Mock
    private TravelProviderRegistry providerRegistry;

    @Mock
    private TravelProvider activityProvider;

    private ActivityOfferRevalidator revalidator;

    @BeforeEach
    void setUp() {
        revalidator = new ActivityOfferRevalidator(providerRegistry);
        lenient().when(providerRegistry.getProvider(any())).thenReturn(activityProvider);
        lenient().when(providerRegistry.getProviderForProduct(any())).thenReturn(activityProvider);
    }

    @Test
    @DisplayName("Activity offer available with changed price -> AVAILABLE + CHANGED")
    void testActivityAvailablePriceChanged() {
        ActivityOfferDto liveActivity = ActivityOfferDto.builder()
                .offerId("hbx-act-42")
                .provider("HBX")
                .title("Camel Ride in Palm Grove")
                .destination("Marrakech")
                .price(new BigDecimal("45.00"))
                .currency("EUR")
                .build();

        when(activityProvider.searchActivities(any(ActivitySearchQuery.class))).thenReturn(List.of(liveActivity));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("ACTIVITY")
                .provider("HBX")
                .providerOfferId("hbx-act-42")
                .snapshotProviderAmount(new BigDecimal("40.00"))
                .snapshotProviderCurrency("EUR")
                .selectedDetails(Map.of(
                        "destination", "Marrakech",
                        "date", "2026-10-20",
                        "title", "Camel Ride in Palm Grove"
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.AVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.CHANGED, result.getPriceStatus());
        assertEquals(new BigDecimal("45.00"), result.getCurrentProviderAmount());
    }
}
