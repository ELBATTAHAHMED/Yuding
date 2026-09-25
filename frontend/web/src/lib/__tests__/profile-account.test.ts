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

  test('routes favorites through Gateway and supports all vertical resource types', async () => {
    const { libraryService } = await import('../../services/library.service.ts');
    let url = '';
    let body = '';
    globalThis.fetch = async (input, init) => {
      url = String(input);
      body = String(init?.body || '');
      return new Response(JSON.stringify({ publicReference: 'fav-123' }), { status: 201 });
    };

    const types = ['HOTEL', 'ACTIVITY', 'DESTINATION', 'FLIGHT', 'TRANSFER', 'TRAIN'] as const;
    for (const resType of types) {
      await libraryService.addFavorite({
        resourceType: resType,
        resourceReference: `ref-${resType}`,
        title: `Test ${resType}`,
      });
      assert.match(url, /\/api\/account\/favorites$/);
      assert.doesNotMatch(url, /:8081/);
      assert.equal(JSON.parse(body).resourceType, resType);
    }
  });

  test('routes recent search and view deletion through Gateway account endpoints', async () => {
    const { libraryService } = await import('../../services/library.service.ts');
    let deleteUrls: string[] = [];
    globalThis.fetch = async (input, init) => {
      if (init?.method === 'DELETE') {
        deleteUrls.push(String(input));
      }
      return new Response(null, { status: 204 });
    };

    await libraryService.deleteRecentSearch('srch-1');
    await libraryService.deleteRecentView('view-1');
    await libraryService.clearRecentSearches();
    await libraryService.clearRecentViews();

    assert.equal(deleteUrls.length, 4);
    assert.match(deleteUrls[0], /\/api\/account\/recent-searches\/srch-1$/);
    assert.match(deleteUrls[1], /\/api\/account\/recent-views\/view-1$/);
    assert.match(deleteUrls[2], /\/api\/account\/recent-searches$/);
    assert.match(deleteUrls[3], /\/api\/account\/recent-views$/);
    for (const u of deleteUrls) {
      assert.doesNotMatch(u, /:(?:8081|8082|8084|8090|8072|7777)/);
    }
  });
});
