package com.ahmed.travelservice.provider.impl.frankfurter.model;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Raw Frankfurter v2 transport model. It never leaves the provider adapter. */
public record FrankfurterRateResponse(LocalDate date, String base, String quote, BigDecimal rate) {
}
