package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.response.ConversionStatus;
import com.ahmed.travelservice.dto.response.PriceConversionSnapshot;
import com.ahmed.travelservice.service.CurrencyService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
class TravelCurrencyControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockBean private CurrencyService currencyService;

    @Test
    void publicRateEndpointReturnsNormalizedSnapshotWithoutProviderNetworkCall() throws Exception {
        when(currencyService.convert(eq(BigDecimal.ONE), eq("EUR"), eq("MAD"))).thenReturn(PriceConversionSnapshot.builder()
                .providerAmount(BigDecimal.ONE).providerCurrency("EUR").exchangeRate(new BigDecimal("10.91"))
                .displayAmount(new BigDecimal("10.91")).displayCurrency("MAD").exchangeRateDate(LocalDate.of(2026, 9, 18))
                .exchangeRateProvider("FRANKFURTER").conversionStatus(ConversionStatus.CONVERTED).build());

        mockMvc.perform(get("/travel/currency/rate").param("from", "EUR").param("to", "MAD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.providerAmount", is(1)))
                .andExpect(jsonPath("$.displayCurrency", is("MAD")))
                .andExpect(jsonPath("$.exchangeRateProvider", is("FRANKFURTER")));
    }
}
