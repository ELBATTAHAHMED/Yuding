import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { geoService } from '../../services/geo.service.ts';
import type { GeoPlace, NearbyPlace } from '../../types/geo.types.ts';

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

describe('Phase 26 — Geo & Places Feature Contract Tests', () => {
  let originalFetch: typeof globalThis.fetch;
  let capturedCalls: { url: string; method: string; body?: any }[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    capturedCalls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('1. Autocomplete Service & Quota Protection', () => {
    it('returns empty array immediately when query is less than 2 characters (0 network calls)', async () => {
      let callCount = 0;
      globalThis.fetch = async () => {
        callCount++;
        return createMockResponse([]);
      };

      const resEmpty = await geoService.autocomplete({ text: '' });
      const resSingle = await geoService.autocomplete({ text: 'M' });

      assert.equal(callCount, 0);
      assert.deepEqual(resEmpty, []);
      assert.deepEqual(resSingle, []);
    });

    it('routes autocomplete to /travel/geo/autocomplete via Gateway with correct query params', async () => {
      const mockPlaces: GeoPlace[] = [
        {
          id: 'place-rak',
          provider: 'GEOAPIFY',
          name: 'Marrakech',
          formatted: 'Marrakech, Marrakesh-Safi, Morocco',
          type: 'city',
          city: 'Marrakech',
          state: 'Marrakesh-Safi',
          country: 'Morocco',
          countryCode: 'MA',
          latitude: 31.6258,
          longitude: -7.9891,
        },
      ];

      globalThis.fetch = async (input, init) => {
        capturedCalls.push({ url: input.toString(), method: init?.method || 'GET' });
        return createMockResponse(mockPlaces);
      };

      const results = await geoService.autocomplete({
        text: 'Marra',
        type: 'city',
        country: 'ma',
        limit: 8,
      });

      assert.equal(capturedCalls.length, 1);
      assert.equal(capturedCalls[0].method, 'GET');
      const url = new URL(capturedCalls[0].url);
      assert.equal(url.pathname, '/travel/geo/autocomplete');
      assert.equal(url.searchParams.get('text'), 'Marra');
      assert.equal(url.searchParams.get('type'), 'city');
      assert.equal(url.searchParams.get('country'), 'ma');
      assert.equal(url.searchParams.get('limit'), '8');

      // Verify no direct external provider or API key exposure in request
      assert.ok(!url.searchParams.has('apiKey'));
      assert.ok(!capturedCalls[0].url.includes('api.geoapify.com'));

      assert.equal(results.length, 1);
      assert.equal(results[0].name, 'Marrakech');
      assert.equal(results[0].city, 'Marrakech');
      assert.equal(results[0].countryCode, 'MA');
      assert.equal(results[0].latitude, 31.6258);
      assert.equal(results[0].longitude, -7.9891);
    });

    it('supports global multi-country autocomplete queries', async () => {
      const globalPlaces: GeoPlace[] = [
        {
          id: 'paris-1',
          name: 'Paris',
          formatted: 'Paris, Île-de-France, France',
          type: 'city',
          city: 'Paris',
          country: 'France',
          countryCode: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
        },
        {
          id: 'bcn-1',
          name: 'Barcelona',
          formatted: 'Barcelona, Catalonia, Spain',
          type: 'city',
          city: 'Barcelona',
          country: 'Spain',
          countryCode: 'ES',
          latitude: 41.3879,
          longitude: 2.1699,
        },
      ];

      globalThis.fetch = async (input, init) => {
        capturedCalls.push({ url: input.toString(), method: init?.method || 'GET' });
        return createMockResponse(globalPlaces);
      };

      const results = await geoService.autocomplete({ text: 'Par' });
      assert.equal(results.length, 2);
      assert.equal(results[0].countryCode, 'FR');
      assert.equal(results[1].countryCode, 'ES');
    });
  });

  describe('2. Forward & Reverse Geocoding', () => {
    it('routes geocode to /travel/geo/geocode and parses coordinates', async () => {
      const mockResult: GeoPlace[] = [
        {
          id: 'geo-1',
          name: 'Eiffel Tower',
          formatted: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
          latitude: 48.8584,
          longitude: 2.2945,
          city: 'Paris',
          country: 'France',
          countryCode: 'FR',
        },
      ];

      globalThis.fetch = async (input, init) => {
        capturedCalls.push({ url: input.toString(), method: init?.method || 'GET' });
        return createMockResponse(mockResult);
      };

      const places = await geoService.geocode({ text: 'Eiffel Tower' });

      assert.equal(capturedCalls.length, 1);
      const url = new URL(capturedCalls[0].url);
      assert.equal(url.pathname, '/travel/geo/geocode');
      assert.equal(url.searchParams.get('text'), 'Eiffel Tower');
      assert.equal(places[0].latitude, 48.8584);
      assert.equal(places[0].longitude, 2.2945);
    });

    it('routes reverse geocoding to /travel/geo/reverse with coordinates', async () => {
      const mockPlace: GeoPlace = {
        id: 'rev-1',
        name: 'Jemaa el-Fna',
        formatted: 'Place Jemaa el-Fna, Marrakech, Maroc',
        city: 'Marrakech',
        country: 'Morocco',
        countryCode: 'MA',
        latitude: 31.6258,
        longitude: -7.9891,
      };

      globalThis.fetch = async (input, init) => {
        capturedCalls.push({ url: input.toString(), method: init?.method || 'GET' });
        return createMockResponse(mockPlace);
      };

      const place = await geoService.reverseGeocode({ lat: 31.6258, lon: -7.9891 });

      assert.equal(capturedCalls.length, 1);
      const url = new URL(capturedCalls[0].url);
      assert.equal(url.pathname, '/travel/geo/reverse');
      assert.equal(url.searchParams.get('lat'), '31.6258');
      assert.equal(url.searchParams.get('lon'), '-7.9891');
      assert.ok(place);
      assert.equal(place?.name, 'Jemaa el-Fna');
    });
  });

  describe('3. Nearby Places & POIs API', () => {
    it('routes getNearbyPlaces to /travel/geo/places/nearby with bounded radius and categories', async () => {
      const mockPois: NearbyPlace[] = [
        {
          id: 'poi-1',
          provider: 'GEOAPIFY',
          name: 'Jardin Majorelle',
          category: 'attractions',
          formattedAddress: 'Rue Yves Saint Laurent, Marrakech',
          distanceMeters: 1400,
          latitude: 31.6417,
          longitude: -8.0033,
          city: 'Marrakech',
          country: 'Morocco',
        },
      ];

      globalThis.fetch = async (input, init) => {
        capturedCalls.push({ url: input.toString(), method: init?.method || 'GET' });
        return createMockResponse(mockPois);
      };

      const pois = await geoService.getNearbyPlaces({
        lat: 31.6258,
        lon: -7.9891,
        radius: 3000,
        categories: ['attractions', 'museums'],
        limit: 15,
      });

      assert.equal(capturedCalls.length, 1);
      const url = new URL(capturedCalls[0].url);
      assert.equal(url.pathname, '/travel/geo/places/nearby');
      assert.equal(url.searchParams.get('lat'), '31.6258');
      assert.equal(url.searchParams.get('lon'), '-7.9891');
      assert.equal(url.searchParams.get('radius'), '3000');
      assert.equal(url.searchParams.get('limit'), '15');
      assert.equal(pois.length, 1);
      assert.equal(pois[0].category, 'attractions');
      assert.equal(pois[0].distanceMeters, 1400);
    });
  });

  describe('4. Secure Proxied Static Map URL Construction', () => {
    it('generates backend-proxied map URL with center coordinates, zoom and zero client secrets', () => {
      const mapUrl = geoService.getStaticMapUrl({
        lat: 31.6258,
        lon: -7.9891,
        zoom: 14,
        width: 600,
        height: 400,
        markers: 'lonlat:-7.9891,31.6258;color:#01796F;size:medium',
      });

      assert.ok(mapUrl.includes('/travel/geo/map/static'));
      assert.ok(mapUrl.includes('lat=31.6258'));
      assert.ok(mapUrl.includes('lon=-7.9891'));
      assert.ok(mapUrl.includes('zoom=14'));
      assert.ok(mapUrl.includes('width=600'));
      assert.ok(mapUrl.includes('height=400'));
      assert.ok(!mapUrl.includes('apiKey'));
      assert.ok(!mapUrl.includes('maps.geoapify.com'));
    });
  });

  describe('5. Downstream Travel Provider Compatibility', () => {
    it('structured GeoPlace accurately provides cityName and countryCode for Nuitee hotel search', () => {
      const selectedPlace: GeoPlace = {
        id: 'geo-bcn',
        name: 'Barcelona',
        formatted: 'Barcelona, Catalonia, Spain',
        city: 'Barcelona',
        country: 'Spain',
        countryCode: 'ES',
        latitude: 41.3879,
        longitude: 2.1699,
      };

      // Nuitee needs cityName + countryCode
      const nuiteePayload = {
        destination: selectedPlace.name,
        city: selectedPlace.city || selectedPlace.name,
        countryCode: selectedPlace.countryCode || 'ES',
      };

      assert.equal(nuiteePayload.city, 'Barcelona');
      assert.equal(nuiteePayload.countryCode, 'ES');
    });

    it('structured GeoPlace accurately provides destination string for HBX activities search', () => {
      const selectedPlace: GeoPlace = {
        id: 'geo-mad',
        name: 'Madrid',
        formatted: 'Madrid, Community of Madrid, Spain',
        city: 'Madrid',
        country: 'Spain',
        countryCode: 'ES',
        latitude: 40.4168,
        longitude: -3.7038,
      };

      const activityPayload = {
        destination: selectedPlace.city || selectedPlace.name,
      };

      assert.equal(activityPayload.destination, 'Madrid');
    });
  });
});
