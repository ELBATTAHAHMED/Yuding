import test, { afterEach, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { weatherService } from '../../services/weather.service.ts';

type CapturedCall = { url: string; method: string };
const originalFetch = globalThis.fetch;
const capturedCalls: CapturedCall[] = [];

function response(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('weatherService', () => {
  beforeEach(() => {
    capturedCalls.length = 0;
    globalThis.fetch = async (input, init) => {
      capturedCalls.push({ url: input.toString(), method: init?.method || 'GET' });
      return response({
        provider: 'OPEN_METEO',
        latitude: 31.6258,
        longitude: -7.9891,
        hourlyForecast: [],
        dailyForecast: [],
      });
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('uses the Gateway weather endpoint with requested coordinates', async () => {
    const result = await weatherService.getWeather({ lat: 31.6258, lon: -7.9891, forecastDays: 7 });

    assert.equal(capturedCalls.length, 1);
    const requestUrl = new URL(capturedCalls[0].url);
    assert.equal(requestUrl.origin, 'http://localhost:8888');
    assert.equal(requestUrl.pathname, '/travel/weather');
    assert.equal(requestUrl.searchParams.get('lat'), '31.6258');
    assert.equal(requestUrl.searchParams.get('lon'), '-7.9891');
    assert.equal(requestUrl.searchParams.get('forecastDays'), '7');
    assert.equal(capturedCalls[0].method, 'GET');
    assert.ok(!capturedCalls[0].url.includes('open-meteo.com'));
    assert.equal(result.provider, 'OPEN_METEO');
  });
});
