package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.query.TransferSearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.dto.response.TransferOfferDto;
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
class TransferOfferRevalidatorTest {

    @Mock
    private TravelProviderRegistry providerRegistry;

    @Mock
    private TravelProvider transferProvider;

    private TransferOfferRevalidator revalidator;

    @BeforeEach
    void setUp() {
        revalidator = new TransferOfferRevalidator(providerRegistry);
        lenient().when(providerRegistry.getProvider(any())).thenReturn(transferProvider);
        lenient().when(providerRegistry.getProviderForProduct(any())).thenReturn(transferProvider);
    }

    @Test
    @DisplayName("Transfer offer available with same price -> AVAILABLE + UNCHANGED")
    void testTransferAvailableSamePrice() {
        TransferOfferDto liveTransfer = TransferOfferDto.builder()
                .offerId("hbx-trans-10")
                .provider("HBX")
                .pickup("RAK Airport")
                .dropoff("Medina Hotel")
                .vehicleModel("Mercedes V-Class")
                .price(new BigDecimal("35.00"))
                .currency("EUR")
                .build();

        when(transferProvider.searchTransfers(any(TransferSearchQuery.class))).thenReturn(List.of(liveTransfer));

        InternalRevalidateOfferRequest request = InternalRevalidateOfferRequest.builder()
                .productType("TRANSFER")
                .provider("HBX")
                .providerOfferId("hbx-trans-10")
                .snapshotProviderAmount(new BigDecimal("35.00"))
                .snapshotProviderCurrency("EUR")
                .selectedDetails(Map.of(
                        "pickup", "RAK Airport",
                        "dropoff", "Medina Hotel",
                        "date", "2026-10-20",
                        "time", "14:00",
                        "vehicleModel", "Mercedes V-Class"
                ))
                .build();

        InternalRevalidationResultDto result = revalidator.revalidate(request);

        assertEquals(OfferAvailabilityStatus.AVAILABLE, result.getAvailabilityStatus());
        assertEquals(OfferPriceStatus.UNCHANGED, result.getPriceStatus());
        assertEquals(new BigDecimal("35.00"), result.getCurrentProviderAmount());
    }
}
