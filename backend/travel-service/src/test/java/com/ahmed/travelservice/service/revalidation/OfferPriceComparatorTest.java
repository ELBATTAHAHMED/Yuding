package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OfferPriceComparatorTest {

    @Test
    @DisplayName("Scale independent comparison: 100.0 EUR vs 100.00 EUR -> UNCHANGED")
    void testScaleIndependentUnchanged() {
        OfferPriceStatus status = OfferPriceComparator.comparePrices(
                new BigDecimal("100.0"), "EUR",
                new BigDecimal("100.00"), "EUR"
        );
        assertEquals(OfferPriceStatus.UNCHANGED, status);
    }

    @Test
    @DisplayName("Price increase: 100 EUR vs 100.01 EUR -> CHANGED")
    void testPriceIncreaseChanged() {
        OfferPriceStatus status = OfferPriceComparator.comparePrices(
                new BigDecimal("100.00"), "EUR",
                new BigDecimal("100.01"), "EUR"
        );
        assertEquals(OfferPriceStatus.CHANGED, status);
    }

    @Test
    @DisplayName("Price decrease: 100 EUR vs 99.00 EUR -> CHANGED")
    void testPriceDecreaseChanged() {
        OfferPriceStatus status = OfferPriceComparator.comparePrices(
                new BigDecimal("100.00"), "EUR",
                new BigDecimal("99.00"), "EUR"
        );
        assertEquals(OfferPriceStatus.CHANGED, status);
    }

    @Test
    @DisplayName("Currency change: 100 EUR vs 100 USD -> CHANGED")
    void testCurrencyChange() {
        OfferPriceStatus status = OfferPriceComparator.comparePrices(
                new BigDecimal("100.00"), "EUR",
                new BigDecimal("100.00"), "USD"
        );
        assertEquals(OfferPriceStatus.CHANGED, status);
    }

    @Test
    @DisplayName("Null snapshot and null current price (e.g. train with no fare) -> NOT_APPLICABLE")
    void testNullPricesNotApplicable() {
        OfferPriceStatus status = OfferPriceComparator.comparePrices(
                null, null,
                null, null
        );
        assertEquals(OfferPriceStatus.NOT_APPLICABLE, status);
    }

    @Test
    @DisplayName("Snapshot had price but live price missing -> NOT_AVAILABLE")
    void testCurrentPriceMissingNotAvailable() {
        OfferPriceStatus status = OfferPriceComparator.comparePrices(
                new BigDecimal("100.00"), "EUR",
                null, null
        );
        assertEquals(OfferPriceStatus.NOT_AVAILABLE, status);
    }
}
