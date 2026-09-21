package com.ahmed.travelservice.currency;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Provider-neutral exchange-rate quote; never a raw external-provider payload. */
public record ExchangeRateQuote(String baseCurrency, String quoteCurrency, BigDecimal rate,
                                LocalDate rateDate, String providerCode) {
}
