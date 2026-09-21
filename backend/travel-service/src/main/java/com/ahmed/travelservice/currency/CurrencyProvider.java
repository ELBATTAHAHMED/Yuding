package com.ahmed.travelservice.currency;

/** Swappable provider boundary for reference exchange rates. */
public interface CurrencyProvider {
    String getProviderCode();

    ExchangeRateQuote getExchangeRate(String fromCurrency, String toCurrency);
}
