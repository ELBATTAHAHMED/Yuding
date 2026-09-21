import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { travelService } from '../../services/travel.service.ts';
import type {
  TrainStation,
  TrainOffer,
  TrainSearchRequest,
  TravelSearchResponse,
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

describe('Trains Feature — Service & Model Contract Tests', () => {
  let originalFetch: typeof globalThis.fetch;
  let capturedCalls: { url: string; method: string; body: any }[];

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    capturedCalls = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('getTrainStations calls GET /travel/trains/stations and returns stations', async () => {
    const mockStations: TrainStation[] = [
      { id: 'CASA_VOYAGEURS', onestopId: 's-evfx4s7cyn-casa~voyageurs', name: 'Casa-Voyageurs', city: 'Casablanca', country: 'Maroc' },
      { id: 'RABAT_AGDAL', onestopId: 's-ey51knftzc-rabat~agdal', name: 'Rabat-Agdal', city: 'Rabat', country: 'Maroc' },
    ];

    globalThis.fetch = async (input, init) => {
      capturedCalls.push({ url: input.toString(), method: init?.method || 'GET', body: undefined });
      return createMockResponse(mockStations);
    };

    const stations = await travelService.getTrainStations();

    assert.equal(capturedCalls.length, 1);
    assert.equal(capturedCalls[0].method, 'GET');
    assert.ok(capturedCalls[0].url.endsWith('/travel/trains/stations'));
    assert.equal(stations.length, 2);
    assert.equal(stations[0].name, 'Casa-Voyageurs');
    assert.equal(stations[1].name, 'Rabat-Agdal');
  });

  it('searchTrains calls POST /travel/trains/search with validated request', async () => {
    const mockResponse: TravelSearchResponse<TrainOffer> = {
      searchId: 'train-search-001',
      status: 'SUCCESS',
      message: 'Found 1 trains',
      totalResults: 1,
      results: [
        {
          offerId: 'train-BORAQ_1001-2025-05-15',
          provider: 'TRANSITLAND',
          source: 'TRANSITLAND_ONCF_GTFS',
          operator: 'ONCF (Office National des Chemins de Fer)',
          trainNumber: 'BORAQ_1001',
          routeName: 'Al Boraq / Tanger - Casablanca (High Speed)',
          productType: 'Al Boraq',
          originStation: 'Casa-Voyageurs',
          destinationStation: 'Rabat-Agdal',
          departureDate: '2025-05-15',
          departureTime: '08:00:00',
          arrivalTime: '08:50:00',
          durationMinutes: 50,
          direct: true,
          stopsCount: 0,
          price: null, // STRICTLY NULL - GTFS has no fares
          currency: 'MAD',
          officialScheduleUrl: 'https://www.oncf-voyages.ma',
        },
      ],
    };

    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
        body: init?.body ? JSON.parse(init.body.toString()) : undefined,
      });
      return createMockResponse(mockResponse);
    };

    const request: TrainSearchRequest = {
      originStation: 'CASA_VOYAGEURS',
      destinationStation: 'RABAT_AGDAL',
      date: '2025-05-15',
      departureTime: '07:30',
      currency: 'MAD',
    };

    const result = await travelService.searchTrains(request);

    assert.equal(capturedCalls.length, 1);
    assert.equal(capturedCalls[0].method, 'POST');
    assert.ok(capturedCalls[0].url.endsWith('/travel/trains/search'));
    assert.equal(capturedCalls[0].body.originStation, 'CASA_VOYAGEURS');
    assert.equal(capturedCalls[0].body.destinationStation, 'RABAT_AGDAL');

    assert.equal(result.status, 'SUCCESS');
    assert.equal(result.results.length, 1);
    const offer = result.results[0];
    assert.equal(offer.productType, 'Al Boraq');
    assert.equal(offer.price, null); // Strictly null
    assert.equal(offer.source, 'TRANSITLAND_ONCF_GTFS');
    assert.equal(offer.officialScheduleUrl, 'https://www.oncf-voyages.ma');
  });

  it('searchTrains surfaces 422 SCHEDULE_DATA_OUTDATED error correctly', async () => {
    globalThis.fetch = async () => {
      return createMockResponse(
        {
          error: 'SCHEDULE_DATA_OUTDATED',
          message:
            'Current timetable data is not available for date 2026-09-25. The underlying GTFS schedule dataset is valid from 2024-01-01 to 2025-12-31. Please check official live schedules on ONCF: https://www.oncf-voyages.ma',
        },
        422
      );
    };

    const request: TrainSearchRequest = {
      originStation: 'CASA_VOYAGEURS',
      destinationStation: 'MARRAKECH',
      date: '2026-09-25',
    };

    await assert.rejects(
      async () => {
        await travelService.searchTrains(request);
      },
      (err: any) => {
        assert.ok(err.message.includes('SCHEDULE_DATA_OUTDATED') || err.message.includes('422') || err.message.includes('not available for date'));
        return true;
      }
    );
  });

  it('getTrainStations passes query parameter for global Transitous autocomplete', async () => {
    globalThis.fetch = async (input, init) => {
      capturedCalls.push({ url: input.toString(), method: init?.method || 'GET', body: undefined });
      return createMockResponse([
        { id: 'FR:StopPlace:87686006', name: 'Paris Gare de Lyon', city: 'Paris', country: 'France', countryCode: 'FR', provider: 'TRANSITOUS' },
      ]);
    };

    const stations = await travelService.getTrainStations('Paris');

    assert.equal(capturedCalls.length, 1);
    assert.ok(capturedCalls[0].url.includes('/travel/trains/stations?query=Paris'));
    assert.equal(stations.length, 1);
    assert.equal(stations[0].provider, 'TRANSITOUS');
    assert.equal(stations[0].countryCode, 'FR');
  });

  it('searchTrains handles Transitous global multi-leg journey offers', async () => {
    const mockTransitousResponse: TravelSearchResponse<TrainOffer> = {
      searchId: 'transitous-001',
      status: 'SUCCESS',
      message: 'Found 1 journeys',
      totalResults: 1,
      results: [
        {
          offerId: 'transitous-paris-lyon-01',
          provider: 'TRANSITOUS',
          source: 'TRANSITOUS_PUBLIC',
          operator: 'SNCF Voyageurs',
          trainNumber: 'TGV INOUI 6611',
          routeName: 'Paris Gare de Lyon -> Lyon Part Dieu',
          productType: 'TGV INOUI',
          originStation: 'Paris Gare de Lyon',
          destinationStation: 'Lyon Part-Dieu',
          departureDate: '2026-09-22',
          departureTime: '08:00:00',
          arrivalTime: '09:56:00',
          durationMinutes: 116,
          direct: true,
          stopsCount: 1,
          numberOfTransfers: 0,
          legs: [
            {
              operator: 'SNCF Voyageurs',
              serviceName: 'TGV INOUI 6611',
              mode: 'HIGHSPEED_RAIL',
              origin: 'Paris Gare de Lyon',
              destination: 'Lyon Part-Dieu',
              departureTime: '08:00:00',
              arrivalTime: '09:56:00',
              durationMinutes: 116,
              intermediateStops: [{ stationName: 'Le Creusot Montceau Montchanin TGV' }],
            },
          ],
          price: null,
          currency: 'EUR',
          officialScheduleUrl: 'https://transitous.org',
        },
      ],
    };

    globalThis.fetch = async (input, init) => {
      capturedCalls.push({
        url: input.toString(),
        method: init?.method || 'GET',
        body: init?.body ? JSON.parse(init.body.toString()) : undefined,
      });
      return createMockResponse(mockTransitousResponse);
    };

    const request: TrainSearchRequest = {
      originStation: 'FR:StopPlace:87686006',
      destinationStation: 'FR:StopPlace:87722025',
      date: '2026-09-22',
      originCoordinates: '48.8448,2.3735',
      destinationCoordinates: '45.7606,4.8594',
      originCountryCode: 'FR',
      destinationCountryCode: 'FR',
    };

    const response = await travelService.searchTrains(request);

    assert.equal(capturedCalls.length, 1);
    assert.equal(capturedCalls[0].body.originCoordinates, '48.8448,2.3735');
    assert.equal(response.results.length, 1);
    const offer = response.results[0];
    assert.equal(offer.provider, 'TRANSITOUS');
    assert.equal(offer.price, null);
    assert.equal(offer.numberOfTransfers, 0);
    assert.equal(offer.legs?.length, 1);
    assert.equal(offer.legs?.[0].mode, 'HIGHSPEED_RAIL');
  });
});

