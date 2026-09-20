package com.ahmed.travelservice.provider.impl.nuitee.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class NuiteeCancelPolicyInfo {
    private String cancelTime;
    private BigDecimal amount;
    private String currency;
    private String type;
    private String timezone;
}
