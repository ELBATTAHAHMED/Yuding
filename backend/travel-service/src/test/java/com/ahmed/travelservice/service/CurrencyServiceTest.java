package com.ahmed.travelservice.service;

import com.ahmed.travelservice.config.CurrencyProperties;
import com.ahmed.travelservice.currency.CurrencyAmount;
import com.ahmed.travelservice.currency.CurrencyProvider;
import com.ahmed.travelservice.currency.ExchangeRateQuote;
import com.ahmed.travelservice.dto.response.ConversionStatus;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CurrencyServiceTest {
    private CurrencyProvider provider;
    private CurrencyService service;

    @BeforeEach
    void setUp() {
        provider = mock(CurrencyProvider.class);
        when(provider.getProviderCode()).thenReturn("FRANKFURTER");
        when(provider.getExchangeRate("EUR", "MAD"))
                .thenReturn(new ExchangeRateQuote("EUR", "MAD", new BigDecimal("10.91"), LocalDate.of(2026, 9, 18), "FRANKFURTER"));
        CurrencyProperties properties = new CurrencyProperties();
        properties.setDisplayCurrency("MAD");
        service = new CurrencyService(provider, properties);
    }

    @Test
    void preservesProviderPriceAndUsesUnambiguousMadPerProviderUnitDirection() {
        var conversion = service.convert(new BigDecimal("49.00"), "eur", "mad");
        assertThat(conversion.getProviderAmount()).isEqualByComparingTo("49.00");
        assertThat(conversion.getProviderCurrency()).isEqualTo("EUR");
        assertThat(conversion.getExchangeRate()).isEqualByComparingTo("10.91");
        assertThat(conversion.getDisplayAmount()).isEqualByComparingTo("534.59");
        assertThat(conversion.getConversionStatus()).isEqualTo(ConversionStatus.CONVERTED);
    }

    @Test
    void sameCurrencyIsIdentityWithoutProviderCall() {
        var conversion = service.convert(new BigDecimal("20.50"), "mad", "MAD");
        assertThat(conversion.getExchangeRate()).isEqualByComparingTo("1");
        assertThat(conversion.getDisplayAmount()).isEqualByComparingTo("20.50");
        assertThat(conversion.getExchangeRateProvider()).isEqualTo("IDENTITY");
        assertThat(conversion.getConversionStatus()).isEqualTo(ConversionStatus.IDENTITY);
        verifyNoInteractions(provider);
    }

    @Test
    void batchDeduplicatesRequestsWithinOneSearchScope() {
        var results = service.convertAll(List.of(new CurrencyAmount(new BigDecimal("10"), "EUR"),
                new CurrencyAmount(new BigDecimal("20"), "EUR")), "MAD");
        assertThat(results).hasSize(2);
        verify(provider, times(1)).getExchangeRate("EUR", "MAD");
    }

    @Test
    void providerFailureKeepsOfferPriceWithUnavailableStatus() {
        when(provider.getExchangeRate(anyString(), anyString())).thenThrow(TravelProviderException.unavailable("FRANKFURTER", "offline"));
        var conversion = service.newRequestScope().convertSupplementary(new BigDecimal("49"), "USD");
        assertThat(conversion.getProviderAmount()).isEqualByComparingTo("49");
        assertThat(conversion.getProviderCurrency()).isEqualTo("USD");
        assertThat(conversion.getDisplayAmount()).isNull();
        assertThat(conversion.getConversionStatus()).isEqualTo(ConversionStatus.UNAVAILABLE);
    }

    @Test
    void invalidPublicCurrencyIsRejectedBeforeProviderRequest() {
        assertThatThrownBy(() -> service.convert(BigDecimal.ONE, "not-a-currency", "MAD")).hasMessageContaining("Invalid ISO currency code");
        verifyNoInteractions(provider);
    }
}
