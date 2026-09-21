# Yuding V2 Currency Service

## Scope

Phase 28 adds provider-neutral, display-only reference conversion in `travel-service`. Frankfurter v2 is the initial rate adapter; its public API uses no API key. The frontend only calls Yuding through the Gateway and never calls Frankfurter directly.

## Price invariant

All provider values remain authoritative and unchanged in their existing `price` / `currency` fields. `PriceConversionSnapshot` adds an immutable companion with `providerAmount`, `providerCurrency`, `exchangeRate`, `displayAmount`, `displayCurrency`, `exchangeRateDate`, `exchangeRateProvider`, and conversion status.

`exchangeRate` always means **display-currency units for one provider-currency unit**. Therefore `displayAmount = providerAmount × exchangeRate`. Calculations use Java `BigDecimal`; only the display amount is rounded with `HALF_UP` to the ISO currency fraction digits (two for MAD).

## Resilience and request scope

Frankfurter failures and unsupported supplier currencies never discard a valid travel offer. The conversion snapshot reports `UNAVAILABLE` and the UI displays the original provider amount with a concise availability message. Same-currency conversion is local (`1`, `IDENTITY`) and makes no provider call. Each search creates one short-lived conversion scope, so repeated EUR→MAD values result in one external request per search; Phase 28 deliberately adds no cross-request or Redis cache.

## Booking readiness

This phase does not create bookings or modify legacy reservation persistence. When the V2 booking offer snapshot is implemented, it must copy the complete `PriceConversionSnapshot` unchanged at selection time, including rate date and provider. A later re-search or rate refresh must never mutate a stored booking snapshot.

## Frankfurter contract

The adapter uses `GET https://api.frankfurter.dev/v2/rate/{base}/{quote}` and parses the documented `date`, `base`, `quote`, and decimal `rate` response. Current rates are reference/mid-market data, not card, bank, settlement, or live-trading rates. See the [official Frankfurter v2 documentation](https://frankfurter.dev/).
