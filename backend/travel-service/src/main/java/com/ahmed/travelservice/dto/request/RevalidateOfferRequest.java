package com.ahmed.travelservice.dto.request;

import com.ahmed.travelservice.provider.TravelProduct;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RevalidateOfferRequest {

    @NotBlank(message = "Offer ID is required for revalidation")
    private String offerId;

    private String provider;

    @NotNull(message = "Product type is required (e.g. FLIGHTS, HOTELS, ACTIVITIES, TRANSFERS)")
    private TravelProduct productType;

    @DecimalMin(value = "0.0", message = "Original price cannot be negative")
    private BigDecimal originalPrice;

    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter uppercase ISO code (e.g. USD, EUR, MAD)")
    private String currency;
}
