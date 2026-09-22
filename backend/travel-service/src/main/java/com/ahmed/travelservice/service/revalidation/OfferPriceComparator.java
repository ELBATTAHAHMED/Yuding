package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferPriceStatus;

import java.math.BigDecimal;

/**
 * Deterministic, scale-independent comparator for provider-native prices.
 */
public final class OfferPriceComparator {

    private OfferPriceComparator() {}

    /**
     * Compares snapshot provider price against current provider price.
     *
     * @param snapshotAmount   Amount recorded in historical snapshot
     * @param snapshotCurrency Currency recorded in historical snapshot
     * @param currentAmount    Current amount returned by live provider check
     * @param currentCurrency  Current currency returned by live provider check
     * @return Normalized OfferPriceStatus
     */
    public static OfferPriceStatus comparePrices(BigDecimal snapshotAmount,
                                                 String snapshotCurrency,
                                                 BigDecimal currentAmount,
                                                 String currentCurrency) {
        // Case 1: Both have no price (e.g. schedule-only trains)
        if (snapshotAmount == null && currentAmount == null) {
            return OfferPriceStatus.NOT_APPLICABLE;
        }

        // Case 2: Live provider returned no price when snapshot had one
        if (currentAmount == null) {
            return OfferPriceStatus.NOT_AVAILABLE;
        }

        // Case 3: Snapshot had no price but live provider returned one
        if (snapshotAmount == null) {
            return OfferPriceStatus.CHANGED;
        }

        // Case 4: Currency changed
        if (snapshotCurrency != null && currentCurrency != null) {
            if (!snapshotCurrency.trim().equalsIgnoreCase(currentCurrency.trim())) {
                return OfferPriceStatus.CHANGED;
            }
        }

        // Case 5 & 6: Same currency numeric comparison via BigDecimal.compareTo (scale-independent)
        if (snapshotAmount.compareTo(currentAmount) == 0) {
            return OfferPriceStatus.UNCHANGED;
        } else {
            return OfferPriceStatus.CHANGED;
        }
    }
}
