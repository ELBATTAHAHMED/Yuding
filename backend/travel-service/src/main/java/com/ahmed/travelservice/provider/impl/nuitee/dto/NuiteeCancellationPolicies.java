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
public class NuiteeCancellationPolicies {
    private List<NuiteeCancelPolicyInfo> cancelPolicyInfos;
    private List<String> hotelRemarks;
    private String refundableTag; // "RFN" or "NRFN"

    public boolean isRefundable() {
        return "RFN".equalsIgnoreCase(refundableTag);
    }
}
