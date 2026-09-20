package com.ahmed.travelservice.provider.impl.nuitee.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class NuiteeRoomType {
    private String roomTypeId;
    private String offerId; // REAL Nuitee offerId
    private String supplier;
    private Integer supplierId;
    private List<NuiteeRate> rates;
    private NuiteePriceItem offerRetailRate;
    private NuiteePriceItem offerInitialPrice;
    private String priceType;
    private String rateType;
}
