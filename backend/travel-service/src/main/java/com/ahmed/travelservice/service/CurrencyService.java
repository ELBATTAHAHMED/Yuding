package com.ahmed.travelservice.service;

import com.ahmed.travelservice.config.CurrencyProperties;
import com.ahmed.travelservice.currency.CurrencyAmount;
import com.ahmed.travelservice.currency.CurrencyPair;
import com.ahmed.travelservice.currency.CurrencyProvider;
import com.ahmed.travelservice.currency.ExchangeRateQuote;
import com.ahmed.travelservice.dto.response.ConversionStatus;
import com.ahmed.travelservice.dto.response.PriceConversionSnapshot;
import com.ahmed.travelservice.exception.TravelValidationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Currency;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Converts provider-backed prices for presentation without ever replacing their original value. */
@Service
public class CurrencyService {
    private final CurrencyProvider currencyProvider;
    private final CurrencyProperties properties;

    public CurrencyService(CurrencyProvider currencyProvider, CurrencyProperties properties) {
        this.currencyProvider = currencyProvider;
        this.properties = properties;
    }

    public ExchangeRateQuote getExchangeRate(String fromCurrency, String toCurrency) {
        String from = normalizeCurrency(fromCurrency);
        String to = normalizeCurrency(toCurrency);
        if (from.equals(to)) return new ExchangeRateQuote(from, to, BigDecimal.ONE, LocalDate.now(), "IDENTITY");
        return currencyProvider.getExchangeRate(from, to);
    }

    public PriceConversionSnapshot convert(BigDecimal amount, String fromCurrency, String toCurrency) {
        if (amount == null) throw new TravelValidationException("INVALID_AMOUNT", "amount", "Amount is required");
        ExchangeRateQuote quote = getExchangeRate(fromCurrency, toCurrency);
        return snapshot(amount, normalizeCurrency(fromCurrency), normalizeCurrency(toCurrency), quote);
    }

    /** Request-scoped batch conversion: one provider request at most per distinct source/target pair. */
    public List<PriceConversionSnapshot> convertAll(List<CurrencyAmount> amounts, String toCurrency) {
        CurrencyConversionScope scope = newRequestScope(toCurrency);
        List<PriceConversionSnapshot> results = new ArrayList<>();
        for (CurrencyAmount amount : amounts) results.add(scope.convertSupplementary(amount.amount(), amount.currency()));
        return results;
    }

    public CurrencyConversionScope newRequestScope() {
        return newRequestScope(properties.getDisplayCurrency());
    }

    public CurrencyConversionScope newRequestScope(String toCurrency) {
        return new CurrencyConversionScope(normalizeCurrency(toCurrency));
    }

    public final class CurrencyConversionScope {
        private final String displayCurrency;
        private final Map<CurrencyPair, ExchangeRateQuote> quotes = new HashMap<>();
        private final Map<CurrencyPair, RuntimeException> failures = new HashMap<>();

        private CurrencyConversionScope(String displayCurrency) { this.displayCurrency = displayCurrency; }

        /** Conversion failures are deliberately represented in the snapshot so valid search offers survive. */
        public PriceConversionSnapshot convertSupplementary(BigDecimal providerAmount, String providerCurrency) {
            if (providerAmount == null || providerCurrency == null || providerCurrency.isBlank()) return null;
            final String from;
            try { from = normalizeCurrency(providerCurrency); }
            catch (RuntimeException exception) { return unavailable(providerAmount, providerCurrency); }
            CurrencyPair pair = new CurrencyPair(from, displayCurrency);
            if (from.equals(displayCurrency)) {
                return snapshot(providerAmount, from, displayCurrency,
                        new ExchangeRateQuote(from, displayCurrency, BigDecimal.ONE, LocalDate.now(), "IDENTITY"));
            }
            if (failures.containsKey(pair)) return unavailable(providerAmount, from);
            try {
                ExchangeRateQuote quote = quotes.computeIfAbsent(pair, ignored -> getExchangeRate(from, displayCurrency));
                return snapshot(providerAmount, from, displayCurrency, quote);
            } catch (RuntimeException exception) {
                failures.put(pair, exception);
                return unavailable(providerAmount, from);
            }
        }
    }

    private PriceConversionSnapshot snapshot(BigDecimal amount, String from, String to, ExchangeRateQuote quote) {
        int fractionDigits = Currency.getInstance(to).getDefaultFractionDigits();
        int scale = fractionDigits >= 0 ? fractionDigits : 2;
        return PriceConversionSnapshot.builder().providerAmount(amount).providerCurrency(from).exchangeRate(quote.rate())
                .displayAmount(amount.multiply(quote.rate()).setScale(scale, RoundingMode.HALF_UP)).displayCurrency(to)
                .exchangeRateDate(quote.rateDate()).exchangeRateProvider(quote.providerCode())
                .conversionStatus(from.equals(to) ? ConversionStatus.IDENTITY : ConversionStatus.CONVERTED).build();
    }

    private PriceConversionSnapshot unavailable(BigDecimal amount, String currency) {
        return PriceConversionSnapshot.builder().providerAmount(amount).providerCurrency(currency.toUpperCase(Locale.ROOT))
                .displayCurrency(properties.getDisplayCurrency().toUpperCase(Locale.ROOT))
                .conversionStatus(ConversionStatus.UNAVAILABLE).build();
    }

    private String normalizeCurrency(String currency) {
        if (currency == null || currency.isBlank()) throw new TravelValidationException("INVALID_CURRENCY", "currency", "ISO currency code is required");
        String normalized = currency.trim().toUpperCase(Locale.ROOT);
        try { return Currency.getInstance(normalized).getCurrencyCode(); }
        catch (IllegalArgumentException exception) { throw new TravelValidationException("INVALID_CURRENCY", "currency", "Invalid ISO currency code: " + normalized); }
    }
}
