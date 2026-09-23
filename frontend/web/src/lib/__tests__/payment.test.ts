import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = dirname(fileURLToPath(import.meta.url));

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

describe('Phase 39 local card simulator boundary', () => {
  it('renders a local-only visual preview without a CVC prop', () => {
    const cardPreviewPath = resolve(testDirectory, '../../components/checkout/CardPreview.tsx');
    const content = readFileSync(cardPreviewPath, 'utf-8');

    assert.ok(content.includes('demoCard?:'), 'CardPreview must accept only the explicitly local visual state');
    assert.equal(/cvc\s*:\s*string/.test(content), false, 'CardPreview must never receive the demo CVC');
    assert.ok(content.includes('•••'), 'CardPreview must keep CVC masked on the back of the artwork');
  });

  it('renders Visa and Mastercard as clearly labelled visual demo forms', () => {
    const paymentFormPath = resolve(testDirectory, '../../components/checkout/PaymentForm.tsx');
    const content = readFileSync(paymentFormPath, 'utf-8');

    assert.ok(content.includes('interface DemoCardState'), 'Demo values must be explicitly distinguished from payment data');
    assert.ok(content.includes('Numéro de carte de démonstration'), 'Visa/Mastercard must render the local demo number field');
    assert.ok(content.includes('Mode démo'), 'Visa/Mastercard must disclose demo mode');
    assert.ok(content.includes('Simulation visuelle uniquement'), 'Visa/Mastercard must disclose local-only behaviour');
    assert.ok(content.includes('Tester l’animation'), 'The demo CTA must not be a payment CTA');
    assert.equal(content.includes("Le paiement direct par carte n'est pas disponible pour ce compte sandbox"), false, 'The obsolete unavailable-card panel must be removed');
    assert.equal(content.includes('Basculer sur PayPal Sandbox'), false, 'The duplicated card-mode PayPal CTA must be removed');
  });

  it('keeps the demo submit path completely separate from paymentService', () => {
    const paymentFormPath = resolve(testDirectory, '../../components/checkout/PaymentForm.tsx');
    const content = readFileSync(paymentFormPath, 'utf-8');
    const demoStart = content.indexOf('const handleDemoSimulation');
    const demoEnd = content.indexOf('return (', demoStart);
    const demoHandler = content.slice(demoStart, demoEnd);

    assert.ok(demoStart >= 0, 'A local demo submit handler must exist');
    assert.equal(/paymentService|bookingService|fetch\(|apiClient|window\.open/.test(demoHandler), false, 'Demo submit must not trigger a network or payment call');
    assert.ok(content.includes('onSubmit={isCardMode ? handleDemoSimulation : handlePay}'), 'Only PayPal may use the provider-backed submit handler');
    assert.ok(content.includes('paymentService.initiatePaymentOrder'), 'The PayPal Sandbox flow must remain unchanged');
    assert.ok(content.includes('paymentService.capturePayment'), 'The PayPal Sandbox capture flow must remain unchanged');
  });

  it('clears demo values on every payment-method switch and never writes browser storage', () => {
    const paymentFormPath = resolve(testDirectory, '../../components/checkout/PaymentForm.tsx');
    const content = readFileSync(paymentFormPath, 'utf-8');
    const switchStart = content.indexOf('const selectPaymentMethod');
    const switchEnd = content.indexOf('const formatDemoNumber', switchStart);
    const switchHandler = content.slice(switchStart, switchEnd);

    assert.ok(content.includes('setDemoCard(EMPTY_DEMO_CARD_STATE)'), 'A reset must discard component-memory demo values');
    assert.ok(switchHandler.includes('clearDemoCard()'), 'Every payment method switch must clear demo values');
    assert.equal(/localStorage|sessionStorage|document\.cookie|URLSearchParams/.test(content), false, 'Demo values must never be persisted or included in URLs');
  });

  it('has no save-card UI or card-network lookup logic', () => {
    const paymentFormPath = resolve(testDirectory, '../../components/checkout/PaymentForm.tsx');
    const content = readFileSync(paymentFormPath, 'utf-8');

    assert.equal(content.includes('setSaveCard'), false, 'PaymentForm must not have saveCard state');
    assert.equal(content.includes(".startsWith('4')"), false, 'PaymentForm must not parse Visa BIN');
    assert.equal(content.includes('5[1-5]'), false, 'PaymentForm must not parse Mastercard BIN');
    assert.ok(content.includes('Zéro Stockage PAN / CVC'), 'PaymentForm must display factual zero-storage assurance');
    assert.equal(content.includes('PCI-DSS Level 1'), false, 'PaymentForm must not make unsupported PCI-DSS claims');
  });

  it('verifies Payment DTOs contain zero card credential fields', () => {
    const typesPath = resolve(testDirectory, '../../types/payment.types.ts');
    const content = readFileSync(typesPath, 'utf-8');

    const forbidden = ['cardNumber', 'pan', 'cvv', 'cvc', 'securityCode', 'expiryMonth', 'expiryYear'];
    for (const field of forbidden) {
      const regex = new RegExp(`\\b${field}\\b`, 'i');
      assert.equal(regex.test(content), false, `Payment DTOs must not contain ${field}`);
    }
  });

  it('verifies PaymentService requests contain zero card credentials', () => {
    const servicePath = resolve(testDirectory, '../../services/payment.service.ts');
    const content = readFileSync(servicePath, 'utf-8');

    assert.equal(/cardNumber|pan|cvv|cvc/i.test(content), false, 'PaymentService must not reference card credentials');
  });
});
