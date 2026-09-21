package com.ahmed.travelservice.dto.response;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Immutable provider-price and display-conversion snapshot.
 *
 * <p>Rate convention: {@code exchangeRate} is display-currency units for one
 * provider-currency unit; {@code displayAmount = providerAmount × exchangeRate}.
 * Booking's future offer snapshot must persist this value unchanged once selected.</p>
 */
@Value
@Builder
public class PriceConversionSnapshot {
    BigDecimal providerAmount;
    String providerCurrency;
    BigDecimal exchangeRate;
    BigDecimal displayAmount;
    String displayCurrency;
    LocalDate exchangeRateDate;
    String exchangeRateProvider;
    ConversionStatus conversionStatus;
}
