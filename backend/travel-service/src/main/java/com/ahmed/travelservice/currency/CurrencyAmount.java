package com.ahmed.travelservice.currency;

import java.math.BigDecimal;

/** A provider amount submitted to a request-scoped display-conversion operation. */
public record CurrencyAmount(BigDecimal amount, String currency) {
}
