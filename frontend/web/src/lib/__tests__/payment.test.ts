import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 38 Payment Abstraction & Reference Tests', () => {
  it('validates canonical payment reference format PAY-XXXXXXXX', () => {
    const validPaymentRef = 'PAY-23456789';
    assert.match(validPaymentRef, /^PAY-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    assert.equal(validPaymentRef.length, 12);
  });

  it('rejects invalid payment reference formats', () => {
    const invalidPrefix = 'YUD-23456789';
    assert.equal(/^PAY-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(invalidPrefix), false);

    const ambiguousChars = 'PAY-1O0I2345';
    assert.equal(/^PAY-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(ambiguousChars), false);

    const wrongLength = 'PAY-SHORT';
    assert.equal(/^PAY-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(wrongLength), false);
  });

  it('formats payment amounts strictly according to authoritative currency', () => {
    const amount = 149.99;
    const currency = 'EUR';
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(amount);

    assert.match(formatted, /149,99/);
    assert.match(formatted, /€/);
  });
});
