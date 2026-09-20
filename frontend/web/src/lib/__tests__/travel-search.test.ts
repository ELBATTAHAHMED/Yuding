import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { travelService } from '../../services/travel.service.ts';
import { apiClient } from '../api-client.ts';
import type {
  FlightSearchRequest,
  HotelSearchRequest,
  ActivitySearchRequest,
  TransferSearchRequest,
  TravelSearchResponse,
  FlightOffer,
  HotelOffer,
  ActivityOffer,
  TransferOffer,
  RevalidateOfferRequest,
  OfferRevalidationResult,
} from '../../types/travel.types.ts';

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

describe('Phase 20 — Travel Search Models & Service Contract Tests', () => {
  let originalFetch: typeof globalThis.fetch;
  let capturedCalls: { url: string; method: string; body: any }[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    capturedCalls = [];

    globalThis.fetch = async (input, init) => {
      const url = input.toString();
      const method = init?.method || 'GET';
      const body = init?.body ? JSON.parse(init.body.toString()) : undefined;
      capturedCalls.push({ url, method, body });

      // Default mock provider-unavailable search response
      const mockResponse: TravelSearchResponse<any> = {
        searchId: 'mock-search-uuid-123',
        status: 'PROVIDER_UNAVAILABLE',
        message: 'Travel provider integrations are scheduled for Phase 21+.',
        totalResults: 0,
        results: [],
      };

      return createMockResponse(mockResponse);
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('1. Flight Search Model & Route Mapping', () => {
    it('routes flight search to "/travel/flights/search" with validated request model', async () => {
      const request: FlightSearchRequest = {
        origin: 'Paris (CDG)',
        destination: 'Casablanca (CMN)',
        departureDate: '2026-07-01',
        returnDate: '2026-07-15',
        adults: 2,
        children: 1,
        infants: 0,
        travelClass: 'BUSINESS',
        nonStop: true,
        currency: 'EUR',
      };

      const response = await travelService.searchFlights(request);

      assert.equal(capturedCalls.length, 1);
      assert.match(capturedCalls[0].url, /\/travel\/flights\/search$/);
      assert.equal(capturedCalls[0].method, 'POST');
      assert.equal(capturedCalls[0].body.origin, 'Paris (CDG)');
      assert.equal(capturedCalls[0].body.destination, 'Casablanca (CMN)');
      assert.equal(capturedCalls[0].body.departureDate, '2026-07-01');
      assert.equal(capturedCalls[0].body.adults, 2);
      assert.equal(capturedCalls[0].body.travelClass, 'BUSINESS');
      assert.equal(capturedCalls[0].body.nonStop, true);

      assert.equal(response.status, 'PROVIDER_UNAVAILABLE');
      assert.equal(response.totalResults, 0);
      assert.deepEqual(response.results, []);
    });

    it('normalizes legacy positional parameters into valid FlightSearchRequest', async () => {
      await travelService.searchFlights('France', 'Paris', 'Marrakech');

      assert.equal(capturedCalls.length, 1);
      assert.match(capturedCalls[0].url, /\/travel\/flights\/search$/);
      assert.equal(capturedCalls[0].body.origin, 'Paris');
      assert.equal(capturedCalls[0].body.destination, 'Marrakech');
      assert.equal(capturedCalls[0].body.adults, 1);
      assert.ok(capturedCalls[0].body.departureDate);
    });
  });

  describe('2. Hotel Search Model & Route Mapping', () => {
    it('routes hotel search to "/travel/hotels/search" with validated request model', async () => {
      const request: HotelSearchRequest = {
        destination: 'Marrakech, Maroc',
        checkIn: '2026-08-10',
        checkOut: '2026-08-15',
        rooms: 1,
        adults: 2,
        children: 1,
        propertyType: 'HOTEL',
        currency: 'EUR',
      };

      const response = await travelService.searchHotels(request);

      assert.equal(capturedCalls.length, 1);
      assert.match(capturedCalls[0].url, /\/travel\/hotels\/search$/);
      assert.equal(capturedCalls[0].method, 'POST');
      assert.equal(capturedCalls[0].body.destination, 'Marrakech, Maroc');
      assert.equal(capturedCalls[0].body.checkIn, '2026-08-10');
      assert.equal(capturedCalls[0].body.checkOut, '2026-08-15');
      assert.equal(capturedCalls[0].body.rooms, 1);
      assert.equal(capturedCalls[0].body.adults, 2);

      assert.equal(response.status, 'PROVIDER_UNAVAILABLE');
      assert.equal(response.totalResults, 0);
      assert.deepEqual(response.results, []);
    });

    it('normalizes legacy positional parameters into valid HotelSearchRequest', async () => {
      await travelService.searchHotels('Maroc', 'Agadir');

      assert.equal(capturedCalls.length, 1);
      assert.match(capturedCalls[0].url, /\/travel\/hotels\/search$/);
      assert.equal(capturedCalls[0].body.destination, 'Agadir, Maroc');
      assert.equal(capturedCalls[0].body.rooms, 1);
      assert.equal(capturedCalls[0].body.adults, 1);
    });
  });

  describe('3. Activity Search Model & Route Mapping', () => {
    it('routes activity search to "/travel/activities/search" with validated request model', async () => {
      const request: ActivitySearchRequest = {
        destination: 'Dakhla',
        date: '2026-09-01',
        travelers: 3,
        category: 'SPORTS',
        radiusKm: 30,
        currency: 'EUR',
      };

      const response = await travelService.searchActivities(request);

      assert.equal(capturedCalls.length, 1);
      assert.match(capturedCalls[0].url, /\/travel\/activities\/search$/);
      assert.equal(capturedCalls[0].method, 'POST');
      assert.equal(capturedCalls[0].body.destination, 'Dakhla');
      assert.equal(capturedCalls[0].body.travelers, 3);
      assert.equal(capturedCalls[0].body.category, 'SPORTS');
      assert.equal(capturedCalls[0].body.radiusKm, 30);

      assert.equal(response.status, 'PROVIDER_UNAVAILABLE');
      assert.equal(response.totalResults, 0);
      assert.deepEqual(response.results, []);
    });
  });

  describe('4. Transfer Search Model & Route Mapping', () => {
    it('routes transfer search to "/travel/transfers/search" with validated request model', async () => {
      const request: TransferSearchRequest = {
        pickup: 'Casablanca Mohammed V Airport (CMN)',
        dropoff: 'Casablanca City Center',
        date: '2026-09-10',
        time: '14:30',
        passengers: 2,
        transferType: 'TAXI',
        currency: 'EUR',
      };

      const response = await travelService.searchTransfers(request);

      assert.equal(capturedCalls.length, 1);
      assert.match(capturedCalls[0].url, /\/travel\/transfers\/search$/);
      assert.equal(capturedCalls[0].method, 'POST');
      assert.equal(capturedCalls[0].body.pickup, 'Casablanca Mohammed V Airport (CMN)');
      assert.equal(capturedCalls[0].body.dropoff, 'Casablanca City Center');
      assert.equal(capturedCalls[0].body.passengers, 2);
      assert.equal(capturedCalls[0].body.transferType, 'TAXI');

      assert.equal(response.status, 'PROVIDER_UNAVAILABLE');
      assert.equal(response.totalResults, 0);
      assert.deepEqual(response.results, []);
    });
  });

  describe('5. Architectural Compliance & Port Isolation', () => {
    it('strictly avoids direct microservice ports (8081, 8082, 8084, 8090, 8072, 7777)', async () => {
      await travelService.searchFlights();
      await travelService.searchHotels();
      await travelService.searchActivities();
      await travelService.searchTransfers();

      const forbiddenPorts = [':8081', ':8082', ':8084', ':8090', ':8072', ':7777'];
      for (const call of capturedCalls) {
        for (const port of forbiddenPorts) {
          assert.ok(
            !call.url.includes(port),
            `Direct microservice port violation found in URL: ${call.url} (contains ${port})`
          );
        }
        assert.ok(
          call.url.includes('/travel/'),
          `Expected Gateway route to contain /travel/, got: ${call.url}`
        );
      }
    });

    it('returns empty results array and explanatory message on PROVIDER_UNAVAILABLE (no fake data)', async () => {
      const result = await travelService.searchFlights({
        origin: 'Paris',
        destination: 'Casablanca',
        departureDate: '2026-07-01',
      });

      assert.equal(result.status, 'PROVIDER_UNAVAILABLE');
      assert.equal(result.totalResults, 0);
      assert.equal(result.results.length, 0);
      assert.ok(result.message.includes('Phase 21+'));
    });
  });

  describe('6. Offer Revalidation Contract (Phase 21)', () => {
    it('routes offer revalidation to "/travel/offers/revalidate" with validated payload', async () => {
      const mockRevalResult: OfferRevalidationResult = {
        offerId: 'FL-TEST-123',
        provider: 'ALPHA',
        valid: true,
        priceChanged: false,
        currentPrice: 150.0,
        originalPrice: 150.0,
        currency: 'EUR',
      };

      globalThis.fetch = async (input, init) => {
        const url = input.toString();
        const method = init?.method || 'GET';
        const body = init?.body ? JSON.parse(init.body.toString()) : undefined;
        capturedCalls.push({ url, method, body });
        return createMockResponse(mockRevalResult);
      };

      const request: RevalidateOfferRequest = {
        offerId: 'FL-TEST-123',
        provider: 'ALPHA',
        productType: 'FLIGHT',
        originalPrice: 150.0,
        currency: 'EUR',
      };

      const response = await travelService.revalidateOffer(request);

      assert.equal(capturedCalls.length, 1);
      assert.match(capturedCalls[0].url, /\/travel\/offers\/revalidate$/);
      assert.equal(capturedCalls[0].method, 'POST');
      assert.equal(capturedCalls[0].body.offerId, 'FL-TEST-123');
      assert.equal(capturedCalls[0].body.productType, 'FLIGHT');
      assert.equal(capturedCalls[0].body.originalPrice, 150.0);
      assert.equal(response.valid, true);
      assert.equal(response.priceChanged, false);
      assert.equal(response.currentPrice, 150.0);
    });
  });
});

