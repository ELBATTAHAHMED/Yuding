package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityOfferDto {
    private String offerId;
    private String provider;
    private String title;
    private String destination;
    private LocalDate date;
    private Double durationHours;
    private String category;
    private BigDecimal price;
    private String currency;
    private PriceConversionSnapshot priceConversion;
    private String imageUrl;
    private String description;
    private String country;
    private String source;
}
