import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPricePresentation } from '../price-display.ts';

describe('Phase 28 price presentation', () => {
  it('prioritizes MAD conversion and retains the provider price', () => {
    const result = getPricePresentation({
      providerAmount: 49,
      providerCurrency: 'EUR',
      exchangeRate: 10.91,
      displayAmount: 534.59,
      displayCurrency: 'MAD',
      exchangeRateDate: '2026-09-21',
      exchangeRateProvider: 'FRANKFURTER',
      conversionStatus: 'CONVERTED',
    }, 49, 'EUR');
    assert.match(result.primary, /534/);
    assert.match(result.original!, /49/);
    assert.equal(result.conversionUnavailable, false);
  });

  it('falls back to the original provider price when conversion is unavailable', () => {
    const result = getPricePresentation({
      providerAmount: 49,
      providerCurrency: 'EUR',
      displayCurrency: 'MAD',
      conversionStatus: 'UNAVAILABLE',
    }, 49, 'EUR');
    assert.match(result.primary, /49/);
    assert.equal(result.conversionUnavailable, true);
  });
});
