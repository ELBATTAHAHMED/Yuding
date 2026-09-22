import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { bookingService } from '../../services/booking.service.ts';
import type {
  BookingProductType,
  BookingResponseDto,
  BookingRevalidationResponseDto,
  BookingPricingResponseDto,
} from '../../types/booking.types.ts';

function createMockResponse(body: any, status = 200): Response {
  const bodyText = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    text: async () => bodyText,
    json: async () => (bodyText ? JSON.parse(bodyText) : {}),
  } as unknown as Response;
}

describe('Booking Flow Integration & Lifecycle Tests (Phases 33–38)', () => {
  let originalFetch: typeof globalThis.fetch;
  let capturedCalls: { url: string; method: string; body?: any; headers?: any }[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    capturedCalls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('validates canonical booking reference format YUD-XXXXXXXX', () => {
    const validRef = 'YUD-7K9M2P4X';
    assert.match(validRef, /^YUD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    assert.equal(validRef.length, 12);

    const invalidPrefix = 'PAY-7K9M2P4X';
    assert.equal(/^YUD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(invalidPrefix), false);

    const ambiguousChars = 'YUD-1O0I2345';
    assert.equal(/^YUD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(ambiguousChars), false);

    const shortRef = 'YUD-123';
    assert.equal(/^YUD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/.test(shortRef), false);
  });

  it('routes createDraftBooking to POST /bookings via Gateway with selectionRef', async () => {
    const mockBooking: BookingResponseDto = {
      bookingReference: 'YUD-A2B3C4D5',
      productType: 'FLIGHT',
      status: 'DRAFT',
      createdAt: '2026-09-22T12:00:00Z',
      updatedAt: '2026-09-22T12:00:00Z',
    };

    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
        body: init?.body ? JSON.parse(init.body.toString()) : undefined,
      });
      return createMockResponse(mockBooking, 201);
    };

    const result = await bookingService.createDraftBooking({
      productType: 'FLIGHT',
      selectionRef: 'sel-flight-uuid-123',
    });

    assert.equal(capturedCalls.length, 1);
    assert.match(capturedCalls[0].url, /\/bookings$/);
    assert.equal(capturedCalls[0].method, 'POST');
    assert.equal(capturedCalls[0].body.productType, 'FLIGHT');
    assert.equal(capturedCalls[0].body.selectionRef, 'sel-flight-uuid-123');
    assert.equal(result.bookingReference, 'YUD-A2B3C4D5');
    assert.equal(result.status, 'DRAFT');
  });

  it('routes revalidateBooking to POST /bookings/{reference}/revalidate', async () => {
    const mockRevalidation: BookingRevalidationResponseDto = {
      bookingReference: 'YUD-A2B3C4D5',
      provider: 'AMADEUS',
      productType: 'FLIGHT',
      availabilityStatus: 'AVAILABLE',
      priceStatus: 'UNCHANGED',
      previousProviderAmount: 250.0,
      previousProviderCurrency: 'EUR',
      currentProviderAmount: 250.0,
      currentProviderCurrency: 'EUR',
      revalidatedAt: '2026-09-22T12:01:00Z',
      validUntil: '2026-09-22T12:06:00Z',
      requiresPriceConfirmation: false,
      priceChangeAccepted: false,
      canProceedToPricing: true,
      message: 'Offer is live and price is verified.',
    };

    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
      });
      return createMockResponse(mockRevalidation, 200);
    };

    const result = await bookingService.revalidateBooking('YUD-A2B3C4D5');

    assert.equal(capturedCalls.length, 1);
    assert.match(capturedCalls[0].url, /\/bookings\/YUD-A2B3C4D5\/revalidate$/);
    assert.equal(capturedCalls[0].method, 'POST');
    assert.equal(result.availabilityStatus, 'AVAILABLE');
    assert.equal(result.priceStatus, 'UNCHANGED');
    assert.equal(result.canProceedToPricing, true);
  });

  it('routes acceptPriceChange to POST /bookings/{reference}/revalidation/accept-price-change', async () => {
    const mockAccepted: BookingRevalidationResponseDto = {
      bookingReference: 'YUD-A2B3C4D5',
      provider: 'HOTELBEDS',
      productType: 'HOTEL',
      availabilityStatus: 'AVAILABLE',
      priceStatus: 'CHANGED',
      previousProviderAmount: 120.0,
      previousProviderCurrency: 'EUR',
      currentProviderAmount: 135.0,
      currentProviderCurrency: 'EUR',
      revalidatedAt: '2026-09-22T12:02:00Z',
      validUntil: '2026-09-22T12:07:00Z',
      requiresPriceConfirmation: false,
      priceChangeAccepted: true,
      canProceedToPricing: true,
      message: 'Price change acknowledged successfully.',
    };

    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
      });
      return createMockResponse(mockAccepted, 200);
    };

    const result = await bookingService.acceptPriceChange('YUD-A2B3C4D5');

    assert.equal(capturedCalls.length, 1);
    assert.match(capturedCalls[0].url, /\/bookings\/YUD-A2B3C4D5\/revalidation\/accept-price-change$/);
    assert.equal(capturedCalls[0].method, 'POST');
    assert.equal(result.priceChangeAccepted, true);
    assert.equal(result.canProceedToPricing, true);
  });

  it('routes createAuthoritativePricing to POST /bookings/{reference}/pricing', async () => {
    const mockPricing: BookingPricingResponseDto = {
      bookingReference: 'YUD-A2B3C4D5',
      pricingStatus: 'PRICED',
      baseAmount: 200.0,
      taxAmount: 40.0,
      feeAmount: 10.0,
      totalAmount: 250.0,
      currency: 'EUR',
      breakdownComplete: true,
      pricedAt: '2026-09-22T12:03:00Z',
      validUntil: '2026-09-22T12:18:00Z',
      provider: 'AMADEUS',
      productType: 'FLIGHT',
      canProceedToPayment: true,
      message: 'Pricing quote established and ready for payment.',
    };

    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
      });
      return createMockResponse(mockPricing, 200);
    };

    const result = await bookingService.createAuthoritativePricing('YUD-A2B3C4D5');

    assert.equal(capturedCalls.length, 1);
    assert.match(capturedCalls[0].url, /\/bookings\/YUD-A2B3C4D5\/pricing$/);
    assert.equal(capturedCalls[0].method, 'POST');
    assert.equal(result.canProceedToPayment, true);
    assert.equal(result.totalAmount, 250.0);
    assert.equal(result.currency, 'EUR');
  });

  it('routes getBookingByReference to GET /bookings/{reference}', async () => {
    const mockBooking: BookingResponseDto = {
      bookingReference: 'YUD-A2B3C4D5',
      productType: 'HOTEL',
      status: 'PAID',
      createdAt: '2026-09-22T12:00:00Z',
      updatedAt: '2026-09-22T12:10:00Z',
    };

    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
      });
      return createMockResponse(mockBooking, 200);
    };

    const result = await bookingService.getBookingByReference('YUD-A2B3C4D5');

    assert.equal(capturedCalls.length, 1);
    assert.match(capturedCalls[0].url, /\/bookings\/YUD-A2B3C4D5$/);
    assert.equal(capturedCalls[0].method, 'GET');
    assert.equal(result.status, 'PAID');
  });

  it('strictly avoids direct microservice ports (8081, 8082, 8084, 8090, 8072, 7777)', async () => {
    globalThis.fetch = async (input) => {
      capturedCalls.push({ url: input.toString(), method: 'GET' });
      return createMockResponse({ bookingReference: 'YUD-A2B3C4D5' }, 200);
    };

    await bookingService.getBookingByReference('YUD-A2B3C4D5');

    const forbiddenPorts = [':8081', ':8082', ':8084', ':8090', ':8072', ':7777'];
    for (const call of capturedCalls) {
      for (const port of forbiddenPorts) {
        assert.equal(
          call.url.includes(port),
          false,
          `Direct port ${port} must never be used: ${call.url}`
        );
      }
    }
  });
});
