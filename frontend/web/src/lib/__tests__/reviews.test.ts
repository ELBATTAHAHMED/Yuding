import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiClient } from '../api-client.ts';
import { reviewService } from '../../services/review.service.ts';

const here = dirname(fileURLToPath(import.meta.url));

describe('Phase 52 verified review flow', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => apiClient.setAccessToken('phase52-test-token'));
  afterEach(() => { globalThis.fetch = originalFetch; apiClient.setAccessToken(null); });

  it('asks backend for eligibility and only submits rating and text via Gateway', async () => {
    const calls: { url: string; method: string; body?: string; authorization?: string }[] = [];
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), method: init?.method || 'GET', body: String(init?.body || ''),
        authorization: new Headers(init?.headers).get('Authorization') || undefined });
      return new Response('{}', { status: 200 });
    };
    await reviewService.eligibility('YUD-ABCDEFGH');
    await reviewService.create('YUD-ABCDEFGH', 5, 'Très bon séjour');
    assert.match(calls[0].url, /:8888\/apic\/reviews\/booking\/YUD-ABCDEFGH\/eligibility$/);
    assert.equal(calls[0].authorization, 'Bearer phase52-test-token');
    assert.deepEqual(JSON.parse(calls[1].body || '{}'), { rating: 5, content: 'Très bon séjour' });
    assert.equal(calls[1].method, 'POST');
    assert.ok(calls.every(call => !/:8090|:8084/.test(call.url)));
  });

  it('keeps no-review state explicit and reads published reviews without credentials', async () => {
    const calls: { url: string; authorization?: string }[] = [];
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), authorization: new Headers(init?.headers).get('Authorization') || undefined });
      return Response.json(calls.length === 1 ? {} : { averageRating: null, reviewCount: 0, reviews: [] });
    };
    assert.equal(await reviewService.mine('YUD-ABCDEFGH'), null);
    assert.deepEqual(await reviewService.public('ACCOMMODATION', 'NUITEE', 'hotel-123'),
      { averageRating: null, reviewCount: 0, reviews: [] });
    assert.equal(calls[1].authorization, undefined);
  });

  it('shows the review action only from server eligibility or an owned existing review', () => {
    const action = readFileSync(resolve(here, '../../app/(user)/account/bookings/BookingReviewAction.tsx'), 'utf8');
    assert.match(action, /eligibility\.data\?\.eligible/);
    assert.match(action, /!review/);
    assert.match(action, /invalidateQueries/);
  });
});
