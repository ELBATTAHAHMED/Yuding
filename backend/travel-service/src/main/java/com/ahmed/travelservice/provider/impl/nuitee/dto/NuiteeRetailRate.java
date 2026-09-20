package com.ahmed.travelservice.provider.impl.nuitee.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class NuiteeRetailRate {
    private List<NuiteePriceItem> total;
    private List<NuiteePriceItem> suggestedSellingPrice;
    private List<NuiteePriceItem> initialPrice;

    public BigDecimal getTotalAmount() {
        if (total != null && !total.isEmpty() && total.get(0).getAmount() != null) {
            return total.get(0).getAmount();
        }
        return null;
    }

    public String getTotalCurrency() {
        if (total != null && !total.isEmpty() && total.get(0).getCurrency() != null) {
            return total.get(0).getCurrency();
        }
        return null;
    }
}
