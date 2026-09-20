import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../api-client.ts';
import { resolveAppEnv, resolveApiBaseUrl } from '../env.ts';

// Helper to create a mock Response
function createMockResponse(body: any, init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}): Response {
  const status = init.status ?? 200;
  const statusText = init.statusText ?? (status === 200 ? 'OK' : 'Error');
  const headers = new Headers(init.headers || {});
  const bodyText = typeof body === 'string' ? body : body !== null && body !== undefined ? JSON.stringify(body) : '';

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers,
    text: async () => bodyText,
    json: async () => (bodyText ? JSON.parse(bodyText) : {}),
  } as unknown as Response;
}

describe('Phase 19 — Production Routing & CORS Tests', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('1. Environment & API Base URL Resolution (env.ts)', () => {
    it('resolves production environment correctly', () => {
      assert.equal(resolveAppEnv('production', 'development'), 'production');
      assert.equal(resolveAppEnv('prod', 'development'), 'production');
      assert.equal(resolveAppEnv(undefined, 'production'), 'production');
    });

    it('resolves staging environment correctly', () => {
      assert.equal(resolveAppEnv('staging', 'development'), 'staging');
    });

    it('resolves development environment by default', () => {
      assert.equal(resolveAppEnv(undefined, undefined), 'development');
    });

    it('defaults production API base to same-origin "/api"', () => {
      const prodApiBase = resolveApiBaseUrl('production', undefined);
      assert.equal(prodApiBase, '/api');
    });

    it('defaults staging API base to same-origin "/api"', () => {
      const stagingApiBase = resolveApiBaseUrl('staging', undefined);
      assert.equal(stagingApiBase, '/api');
    });

    it('defaults development API base to "http://localhost:8888"', () => {
      const devApiBase = resolveApiBaseUrl('development', undefined);
      assert.equal(devApiBase, 'http://localhost:8888');
    });

    it('strictly forbids localhost in production configuration (fail fast)', () => {
      assert.throws(
        () => resolveApiBaseUrl('production', 'http://localhost:8888'),
        /\[Security Violation\] Insecure localhost API base URL/
      );
      assert.throws(
        () => resolveApiBaseUrl('production', 'http://127.0.0.1:8888'),
        /\[Security Violation\] Insecure localhost API base URL/
      );
    });

    it('strictly forbids localhost in staging configuration', () => {
      assert.throws(
        () => resolveApiBaseUrl('staging', 'http://localhost:8888'),
        /\[Security Violation\] Insecure localhost API base URL/
      );
    });

    it('allows valid remote HTTPS origin in production', () => {
      const customUrl = resolveApiBaseUrl('production', 'https://api.yuding.travel');
      assert.equal(customUrl, 'https://api.yuding.travel');
    });
  });

  describe('2. Same-Origin /api Request Routing (ApiClient)', () => {
    it('routes requests to "/api/*" under production base', async () => {
      const client = new ApiClient('/api');
      let capturedUrl = '';
      let capturedInit: RequestInit | undefined;

      globalThis.fetch = async (input, init) => {
        capturedUrl = input.toString();
        capturedInit = init;
        return createMockResponse({ user: 'ahmed' }, { status: 200, headers: { 'X-Request-Id': 'req-abc-123' } });
      };

      const res = await client.get<{ user: string }>('/auth/me', false, { requestId: 'corr-001' });

      assert.equal(capturedUrl, '/api/auth/me');
      assert.equal(capturedInit?.credentials, 'include');
      const headers = capturedInit?.headers as Record<string, string>;
      assert.equal(headers['X-Correlation-Id'], 'corr-001');
      assert.deepEqual(res, { user: 'ahmed' });
    });

    it('maps all gateway route groups through "/api/*" edge prefix', async () => {
      const client = new ApiClient('/api');
      const endpointsTested: string[] = [];

      globalThis.fetch = async (input) => {
        endpointsTested.push(input.toString());
        return createMockResponse({ ok: true }, { status: 200 });
      };

      await client.post('/auth/login', { body: {} });
      await client.get('/admin/users');
      await client.get('/apir/reservations/me');
      await client.get('/apic/commentaires');
      await client.post('/ai/chat', { body: {} });

      assert.deepEqual(endpointsTested, [
        '/api/auth/login',
        '/api/admin/users',
        '/api/apir/reservations/me',
        '/api/apic/commentaires',
        '/api/ai/chat',
      ]);
    });

    it('refresh token request routes to "/api/auth/refresh" with credentials: include', async () => {
      const client = new ApiClient('/api');
      let capturedUrl = '';
      let capturedInit: RequestInit | undefined;

      globalThis.fetch = async (input, init) => {
        capturedUrl = input.toString();
        capturedInit = init;
        return createMockResponse({ accessToken: 'new-jwt-access-token' }, { status: 200 });
      };

      const newToken = await client.refreshToken();

      assert.equal(capturedUrl, '/api/auth/refresh');
      assert.equal(capturedInit?.credentials, 'include');
      assert.equal(newToken, 'new-jwt-access-token');
      assert.equal(client.getAccessToken(), 'new-jwt-access-token');
    });
  });

  describe('3. Conceptual Edge Proxy Mapping Contract', () => {
    it('verifies public edge prefix stripping contract', () => {
      const routes = [
        { publicEdge: '/api/auth/login', gatewayInternal: '/auth/login' },
        { publicEdge: '/api/admin/users', gatewayInternal: '/admin/users' },
        { publicEdge: '/api/apir/reservations/123', gatewayInternal: '/apir/reservations/123' },
        { publicEdge: '/api/apic/commentaires', gatewayInternal: '/apic/commentaires' },
        { publicEdge: '/api/ai/chat', gatewayInternal: '/ai/chat' },
      ];

      for (const route of routes) {
        const stripped = route.publicEdge.replace(/^\/api/, '');
        assert.equal(stripped, route.gatewayInternal);
      }
    });
  });
});
