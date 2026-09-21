package com.ahmed.travelservice.provider.impl.frankfurter;

import com.ahmed.travelservice.currency.CurrencyProvider;
import com.ahmed.travelservice.currency.ExchangeRateQuote;
import com.ahmed.travelservice.provider.impl.frankfurter.model.FrankfurterRateResponse;
import org.springframework.stereotype.Component;

/** Provider-neutral adapter for Frankfurter v2 reference rates. */
@Component
public class FrankfurterCurrencyProvider implements CurrencyProvider {
    private final FrankfurterClient client;

    public FrankfurterCurrencyProvider(FrankfurterClient client) {
        this.client = client;
    }

    @Override public String getProviderCode() { return FrankfurterClient.PROVIDER_CODE; }

    @Override
    public ExchangeRateQuote getExchangeRate(String fromCurrency, String toCurrency) {
        FrankfurterRateResponse response = client.getRate(fromCurrency, toCurrency);
        return new ExchangeRateQuote(response.base().toUpperCase(), response.quote().toUpperCase(), response.rate(),
                response.date(), getProviderCode());
    }
}
