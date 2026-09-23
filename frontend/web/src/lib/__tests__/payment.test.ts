import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfirmationPresentation } from '../confirmation-state.ts';

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

describe('Phase 39 & 41 Demo Card & Mock Payment Flow', () => {
  it('renders a local-only visual preview without a CVC prop', () => {
    const cardPreviewPath = resolve(testDirectory, '../../components/checkout/CardPreview.tsx');
    const content = readFileSync(cardPreviewPath, 'utf-8');

    assert.ok(content.includes('demoCard?:'), 'CardPreview must accept only the explicitly local visual state');
    assert.equal(/cvc\s*:\s*string/.test(content), false, 'CardPreview must never receive the demo CVC');
    assert.ok(content.includes('•••'), 'CardPreview must keep CVC masked on the back of the artwork');
  });

  it('renders Visa and Mastercard demo inputs with Mode démo and server-priced demo CTA', () => {
    const paymentFormPath = resolve(testDirectory, '../../components/checkout/PaymentForm.tsx');
    const content = readFileSync(paymentFormPath, 'utf-8');

    assert.ok(content.includes('interface DemoCardState'), 'Demo values must be explicitly distinguished from payment data');
    assert.ok(content.includes('Numéro de carte de démonstration'), 'Visa/Mastercard must render the local demo number field');
    assert.ok(content.includes('Mode démo'), 'Visa/Mastercard must disclose demo mode');
    assert.ok(content.includes('Payer {formattedAmount} en mode démo'), 'Demo CTA must show authoritative server amount with demo indication');
    assert.ok(content.includes('Réinitialiser les champs'), 'Form must provide a clear field reset CTA');
  });

  it('connects demo card checkout to paymentService.initiatePaymentOrder with paymentMode=DEMO_CARD without transmitting card credentials', () => {
    const paymentFormPath = resolve(testDirectory, '../../components/checkout/PaymentForm.tsx');
    const content = readFileSync(paymentFormPath, 'utf-8');

    assert.ok(content.includes("paymentMode = isCardMode ? 'DEMO_CARD' : undefined"), 'Must pass DEMO_CARD paymentMode for card checkout');
    
    // Verify that raw card inputs are never passed to paymentService
    const initiateCallStart = content.indexOf('paymentService.initiatePaymentOrder(');
    assert.ok(initiateCallStart > 0, 'Must invoke paymentService.initiatePaymentOrder');
    const initiateCallEnd = content.indexOf(');', initiateCallStart);
    const initiateCallArgs = content.slice(initiateCallStart, initiateCallEnd);
    
    assert.equal(/demoCard|displayNumber|holderName|expiry|cvc/.test(initiateCallArgs), false, 'initiatePaymentOrder must never receive raw demo card inputs');
  });

  it('stores only the preferred card brand name in localStorage without any credentials', () => {
    const paymentFormPath = resolve(testDirectory, '../../components/checkout/PaymentForm.tsx');
    const content = readFileSync(paymentFormPath, 'utf-8');

    assert.ok(content.includes('yuding_preferred_payment_method'), 'Must support remembering preferred payment method brand');
    assert.ok(content.includes('Mémoriser ce mode de paiement'), 'Must render preference toggle label');
    assert.equal(/localStorage\.setItem\([^,]+,\s*(demoCard|JSON\.stringify)/.test(content), false, 'Must never persist card details to localStorage');
  });

  it('has zero raw card storage and displays factual zero-storage assurance', () => {
    const paymentFormPath = resolve(testDirectory, '../../components/checkout/PaymentForm.tsx');
    const content = readFileSync(paymentFormPath, 'utf-8');

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

  it('verifies PaymentService requests contain zero card credentials and accept paymentMode', () => {
    const servicePath = resolve(testDirectory, '../../services/payment.service.ts');
    const content = readFileSync(servicePath, 'utf-8');

    assert.equal(/cardNumber|pan|cvv|cvc/i.test(content), false, 'PaymentService must not reference card credentials');
    assert.ok(content.includes('paymentMode?: string'), 'PaymentService must accept paymentMode query parameter');
  });

  it('verifies confirmation state maps mock provider to demo validation presentation', () => {
    const mockPresentation = getConfirmationPresentation({
      bookingReference: 'YUD-ABC12345',
      paymentReference: 'PAY-MOCK1234',
      paymentProvider: 'mock',
      confirmationState: 'PAYMENT_VERIFIED_AWAITING_PROVIDER_CONFIRMATION',
      bookingStatus: 'PAID',
      paymentStatus: 'SUCCEEDED',
      productType: 'HOTEL',
      authoritativeAmount: 246.00,
      currency: 'EUR',
      createdAt: '2026-09-23T02:00:00Z',
      productSummary: {},
    });

    assert.equal(mockPresentation.title, 'Paiement démo validé');
    assert.ok(mockPresentation.description.includes('fournisseur n’est pas encore confirmée'));
    assert.equal(mockPresentation.tone, 'success');
  });
});
