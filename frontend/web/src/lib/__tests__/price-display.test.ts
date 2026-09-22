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

  it('returns Tarif indisponible when amount is 0, null, or negative', () => {
    const res0 = getPricePresentation(undefined, 0, 'EUR');
    assert.equal(res0.primary, 'Tarif indisponible');

    const resNull = getPricePresentation(undefined, null, 'EUR');
    assert.equal(resNull.primary, 'Tarif indisponible');

    const resNeg = getPricePresentation(undefined, -10, 'EUR');
    assert.equal(resNeg.primary, 'Tarif indisponible');
  });
});
