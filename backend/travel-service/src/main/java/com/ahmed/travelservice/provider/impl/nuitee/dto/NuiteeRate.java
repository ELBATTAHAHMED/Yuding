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
public class NuiteeRate {
    private String rateId;
    private Integer occupancyNumber;
    private String name;
    private Integer maxOccupancy;
    private Integer adultCount;
    private Integer childCount;
    private List<Integer> childrenAges;
    private String boardType;
    private String boardName;
    private String remarks;
    private String priceType;
    private NuiteeRetailRate retailRate;
    private NuiteeCancellationPolicies cancellationPolicies;
    private List<String> paymentTypes;
}
