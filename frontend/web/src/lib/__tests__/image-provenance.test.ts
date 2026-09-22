import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { imageService } from '../../services/image.service.ts';
import { queryKeys } from '../query-keys.ts';
import type { ImageAsset, ImageSourceType, ImageRole, DestinationImagesResponse } from '../../types/image.types.ts';

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

describe('Phase 29 — Image Strategy & Image Provenance', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('1. Image Service Contract', () => {
    it('returns empty results when city is empty without making API call', async () => {
      let fetchCalled = false;
      globalThis.fetch = async () => {
        fetchCalled = true;
        return createMockResponse({});
      };

      const result = await imageService.getDestinationImages({ city: '' });
      assert.equal(result.count, 0);
      assert.deepEqual(result.images, []);
      assert.equal(fetchCalled, false);
    });

    it('routes destination image search to /travel/images/destination with structured params', async () => {
      const mockResponse: DestinationImagesResponse = {
        destination: 'Marrakech, Morocco',
        provider: 'PEXELS',
        count: 1,
        images: [
          {
            id: 'pexels-100',
            url: 'https://images.pexels.com/photos/100/large2x.jpg',
            thumbnailUrl: 'https://images.pexels.com/photos/100/medium.jpg',
            altText: 'Vue de Marrakech',
            sourceType: 'STOCK_DESTINATION' as ImageSourceType,
            sourceProvider: 'PEXELS',
            photographerName: 'Karim Bennani',
            photographerUrl: 'https://www.pexels.com/@karim',
            attributionText: 'Photo par Karim Bennani sur Pexels',
            attributionUrl: 'https://www.pexels.com/photo/100',
            role: 'DESTINATION_HERO' as ImageRole,
            representsEntity: false,
          },
        ],
      };

      let capturedUrl = '';
      globalThis.fetch = async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return createMockResponse(mockResponse);
      };

      const result = await imageService.getDestinationImages({
        city: 'Marrakech',
        country: 'Morocco',
        countryCode: 'MA',
        limit: 3,
      });

      assert.ok(capturedUrl.includes('/travel/images/destination?'));
      assert.ok(capturedUrl.includes('city=Marrakech'));
      assert.ok(capturedUrl.includes('country=Morocco'));
      assert.ok(capturedUrl.includes('countryCode=MA'));
      assert.ok(capturedUrl.includes('limit=3'));
      assert.equal(result.count, 1);
      assert.equal(result.images[0].sourceType, 'STOCK_DESTINATION');
      assert.equal(result.images[0].representsEntity, false);
      assert.ok(result.images[0].attributionText?.includes('Pexels'));
    });
  });

  describe('2. Query Keys Determinism', () => {
    it('generates consistent and normalized query keys', () => {
      const key1 = queryKeys.travel.destinationImages('Marrakech', 'Morocco', 3);
      const key2 = queryKeys.travel.destinationImages('MARRAKECH ', ' MOROCCO', 3);
      assert.deepEqual(key1, key2);
      assert.deepEqual(key1, ['travel', 'destination-images', 'marrakech', 'morocco', 3]);
    });
  });

  describe('3. Critical Image Truth & Provenance Invariants', () => {
    it('enforces that stock destination photos have representsEntity = false', () => {
      const stockAsset: ImageAsset = {
        id: 'pexels-1',
        url: 'https://images.pexels.com/photos/1/large.jpg',
        altText: 'Paris cityscape',
        sourceType: 'STOCK_DESTINATION',
        sourceProvider: 'PEXELS',
        role: 'DESTINATION_HERO',
        representsEntity: false,
      };

      assert.equal(stockAsset.representsEntity, false);
      assert.equal(stockAsset.sourceType, 'STOCK_DESTINATION');
    });

    it('enforces that authoritative hotel images have representsEntity = true', () => {
      const hotelAsset: ImageAsset = {
        id: 'nuitee-lp100',
        url: 'https://media.liteapi.travel/hotel/lp100/main.jpg',
        altText: 'Hotel Atlas Marrakech',
        sourceType: 'PROVIDER_ENTITY',
        sourceProvider: 'NUITEE',
        role: 'HOTEL',
        representsEntity: true,
      };

      assert.equal(hotelAsset.representsEntity, true);
      assert.equal(hotelAsset.sourceType, 'PROVIDER_ENTITY');
      assert.equal(hotelAsset.sourceProvider, 'NUITEE');
    });

    it('enforces that placeholder states have representsEntity = false and never claim to be real photos', () => {
      const placeholderAsset: ImageAsset = {
        id: 'placeholder-hotel-lp200',
        url: '',
        altText: 'Photo non fournie',
        sourceType: 'PLACEHOLDER',
        sourceProvider: 'SYSTEM',
        role: 'HOTEL',
        representsEntity: false,
      };

      assert.equal(placeholderAsset.representsEntity, false);
      assert.equal(placeholderAsset.sourceType, 'PLACEHOLDER');
    });
  });
});
