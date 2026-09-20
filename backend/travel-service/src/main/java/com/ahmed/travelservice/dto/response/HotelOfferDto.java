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
public class HotelOfferDto {
    private String offerId;
    private String provider;
    private String hotelName;
    private String destination;
    private String propertyType;
    private String roomSummary;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private BigDecimal pricePerNight;
    private BigDecimal totalPrice;
    private String currency;
    private Double starRating;
    private String imageUrl;
}
