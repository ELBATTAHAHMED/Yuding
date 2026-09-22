package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferOfferDto {
    private String offerId;
    private String selectionRef;
    private String provider;
    private String transferType;
    private String vehicleModel;
    private String pickup;
    private String dropoff;
    private LocalDate date;
    private LocalTime time;
    private Integer capacity;
    private BigDecimal price;
    private String currency;
    private PriceConversionSnapshot priceConversion;
}
