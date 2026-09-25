import test, { afterEach, beforeEach, describe } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../../services/auth.service.ts';
import { apiClient } from '../api-client.ts';

describe('Phase 49 profile and traveler contracts', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => apiClient.setAccessToken('profile-jwt'));
  afterEach(() => { globalThis.fetch = originalFetch; apiClient.setAccessToken(null); });

  test('updates profile through the authenticated account endpoint', async () => {
    let request: RequestInit | undefined;
    globalThis.fetch = async (_input, init) => { request = init; return new Response(JSON.stringify({ firstName: 'Sara' }), { status: 200 }); };
    await authService.updateProfile({ firstName: 'Sara', lastName: 'Test', preferredCurrency: 'MAD', preferredLanguage: 'fr' });
    assert.equal(request?.method, 'PATCH');
    assert.deepEqual(JSON.parse(String(request?.body)), { firstName: 'Sara', lastName: 'Test', preferredCurrency: 'MAD', preferredLanguage: 'fr' });
  });

  test('keeps travelers on the Gateway-owned authenticated route', async () => {
    let url = '';
    globalThis.fetch = async input => { url = String(input); return new Response('[]', { status: 200 }); };
    await authService.getTravelers();
    assert.match(url, /\/api\/account\/travelers$/);
    assert.doesNotMatch(url, /:8081/);
  });
});
