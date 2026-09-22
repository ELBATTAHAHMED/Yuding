package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

/**
 * Trusted server-side representation of a resolved travel offer ready for snapshot creation.
 * Decoupled from public client manipulation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolvedOfferDto {

    /** Opaque server-issued selection reference token. */
    private String selectionRef;

    /** Travel product type (FLIGHT, HOTEL, ACTIVITY, TRANSFER, TRAIN). */
    private String productType;

    /** Source provider code (e.g. SCRAPPA, NUITEE, HBX, ONCF_GTFS, TRANSITOUS). */
    private String provider;

    /** Stable/real upstream provider offer identifier. */
    private String providerOfferId;

    /** Normalized product-specific details map (safe JSONB content). */
    private Map<String, Object> selectedDetails;

    /** Historical discovery price normalized by provider. */
    private BigDecimal providerAmount;

    /** Provider currency (e.g. "EUR", "USD", "MAD"). */
    private String providerCurrency;

    /** Display conversion amount if present at discovery. */
    private BigDecimal displayAmount;

    /** Display currency if present at discovery. */
    private String displayCurrency;

    /** Exchange rate applied at discovery time. */
    private BigDecimal exchangeRate;

    /** Exchange rate date. */
    private LocalDate exchangeRateDate;

    /** Exchange rate provider (e.g. "FRANKFURTER"). */
    private String exchangeRateProvider;

    /** Expiration timestamp supplied directly by provider, if any. */
    private Instant providerExpiresAt;

    /** Default server-side selection snapshot expiration timestamp. */
    private Instant snapshotExpiresAt;
}
