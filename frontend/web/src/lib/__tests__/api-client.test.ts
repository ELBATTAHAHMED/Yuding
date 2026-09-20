import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, ApiError } from '../api-client.ts';

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

describe('ApiClient Unit Tests', () => {
  let originalFetch: typeof globalThis.fetch;
  let client: ApiClient;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    client = new ApiClient('http://localhost:8888');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. Normal successful GET request with JSON parsing', async () => {
    let capturedUrl = '';
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = async (input, init) => {
      capturedUrl = input.toString();
      capturedInit = init;
      return createMockResponse({ data: 'success' }, { status: 200 });
    };

    const res = await client.get<{ data: string }>('/apir/test');

    assert.equal(capturedUrl, 'http://localhost:8888/apir/test');
    assert.equal(capturedInit?.method, 'GET');
    assert.equal(capturedInit?.credentials, 'include');
    assert.deepEqual(res, { data: 'success' });
  });

  it('2. Normal successful POST request with body serialization', async () => {
    let capturedInit: RequestInit | undefined;

    globalThis.fetch = async (_, init) => {
      capturedInit = init;
      return createMockResponse({ id: '123' }, { status: 201 });
    };

    const res = await client.post<{ id: string }>('/auth/login', { username: 'test', password: 'pwd' });

    assert.equal(capturedInit?.method, 'POST');
    assert.equal(capturedInit?.body, JSON.stringify({ username: 'test', password: 'pwd' }));
    assert.deepEqual(res, { id: '123' });
  });

  it('3. Authorization header injection when requiresAuth is true and token is set', async () => {
    let capturedHeaders: Record<string, string> = {};

    client.setAccessToken('mock-access-token');

    globalThis.fetch = async (_, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return createMockResponse({ user: 'alice' });
    };

    await client.get('/auth/me', true);

    assert.equal(capturedHeaders['Authorization'], 'Bearer mock-access-token');
  });

  it('4. Authorization header omitted when requiresAuth is false even if token exists', async () => {
    let capturedHeaders: Record<string, string> = {};

    client.setAccessToken('mock-access-token');

    globalThis.fetch = async (_, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return createMockResponse({ public: 'info' });
    };

    await client.get('/public/info', false);

    assert.equal(capturedHeaders['Authorization'], undefined);
  });

  it('5. 204 No Content handling returns empty object', async () => {
    globalThis.fetch = async () => {
      return createMockResponse(null, { status: 204 });
    };

    const res = await client.delete('/apir/items/1', true);
    assert.deepEqual(res, {});
  });

  it('6. Backend error normalization with code and validation details', async () => {
    globalThis.fetch = async () => {
      return createMockResponse(
        {
          code: 'VALIDATION_FAILED',
          message: 'Invalid input fields',
          errors: { email: ['Email already taken'] },
        },
        { status: 400, headers: { 'X-Request-Id': 'req-987' } }
      );
    };

    try {
      await client.post('/auth/register', { email: 'bad' });
      assert.fail('Should have thrown ApiError');
    } catch (err) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 400);
      assert.equal(err.errorCode, 'VALIDATION_FAILED');
      assert.equal(err.message, 'Invalid input fields');
      assert.equal(err.requestId, 'req-987');
      assert.deepEqual(err.validationErrors, { email: ['Email already taken'] });
      assert.equal(err.isAuthError, false);
    }
  });

  it('7. Request timeout produces ApiError with isTimeout = true and status = 0', async () => {
    globalThis.fetch = async (_, init) => {
      return new Promise((_, reject) => {
        // Wait longer than timeout
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    };

    try {
      await client.get('/apir/slow', false, { timeoutMs: 50 });
      assert.fail('Should have timed out');
    } catch (err) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.isTimeout, true);
      assert.equal(err.status, 0);
      assert.equal(err.errorCode, 'REQUEST_TIMEOUT');
    }
  });

  it('8. 401 Unauthorized triggers refresh and retries original request successfully', async () => {
    let callCount = 0;
    client.setAccessToken('old-token');

    globalThis.fetch = async (input, init) => {
      const url = input.toString();
      callCount++;

      if (url.includes('/auth/refresh')) {
        return createMockResponse({ accessToken: 'new-token' });
      }

      if (url.includes('/apir/protected')) {
        const headers = init?.headers as Record<string, string>;
        if (headers['Authorization'] === 'Bearer old-token') {
          return createMockResponse({ message: 'Token expired' }, { status: 401 });
        }
        if (headers['Authorization'] === 'Bearer new-token') {
          return createMockResponse({ secret: 'authorized-data' });
        }
      }

      return createMockResponse({ error: 'Not found' }, { status: 404 });
    };

    const res = await client.get<{ secret: string }>('/apir/protected', true);

    assert.deepEqual(res, { secret: 'authorized-data' });
    assert.equal(client.getAccessToken(), 'new-token');
    assert.equal(callCount, 3); // initial (401) + refresh + retry (200)
  });

  it('9. Concurrent 401 requests trigger only ONE refresh call (single-flight)', async () => {
    let refreshCalls = 0;
    client.setAccessToken('initial-token');

    globalThis.fetch = async (input, init) => {
      const url = input.toString();

      if (url.includes('/auth/refresh')) {
        refreshCalls++;
        // Simulate a short refresh delay
        await new Promise((resolve) => setTimeout(resolve, 30));
        return createMockResponse({ accessToken: 'single-flight-token' });
      }

      const headers = init?.headers as Record<string, string>;
      if (headers['Authorization'] === 'Bearer initial-token') {
        return createMockResponse({ message: 'Expired' }, { status: 401 });
      }
      if (headers['Authorization'] === 'Bearer single-flight-token') {
        return createMockResponse({ path: url });
      }

      return createMockResponse({}, { status: 400 });
    };

    // Launch 3 simultaneous requests that all receive 401
    const [res1, res2, res3] = await Promise.all([
      client.get<{ path: string }>('/apir/req1', true),
      client.get<{ path: string }>('/apir/req2', true),
      client.get<{ path: string }>('/apir/req3', true),
    ]);

    assert.equal(refreshCalls, 1, 'Exactly one /auth/refresh request must be made');
    assert.equal(client.getAccessToken(), 'single-flight-token');
    assert.ok(res1.path.includes('req1'));
    assert.ok(res2.path.includes('req2'));
    assert.ok(res3.path.includes('req3'));
  });

  it('10. Failed refresh clears token and throws clean 401 ApiError', async () => {
    client.setAccessToken('expired-token');

    globalThis.fetch = async (input) => {
      const url = input.toString();
      if (url.includes('/auth/refresh')) {
        return createMockResponse({ message: 'Invalid refresh token' }, { status: 401 });
      }
      return createMockResponse({ message: 'Unauthorized' }, { status: 401 });
    };

    try {
      await client.get('/apir/sensitive', true);
      assert.fail('Should have thrown on failed refresh');
    } catch (err) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 401);
      assert.equal(err.isAuthError, true);
      assert.equal(client.getAccessToken(), null, 'Token should be cleared on failed refresh');
    }
  });

  it('11. Prevents infinite refresh loop on retried 401 request', async () => {
    let refreshCalls = 0;
    client.setAccessToken('bad-token');

    globalThis.fetch = async (input) => {
      const url = input.toString();
      if (url.includes('/auth/refresh')) {
        refreshCalls++;
        return createMockResponse({ accessToken: 'still-unauthorized-token' });
      }
      // Always return 401 even with new token
      return createMockResponse({ message: 'Revoked' }, { status: 401 });
    };

    try {
      await client.get('/apir/loop-test', true);
      assert.fail('Should throw');
    } catch (err) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 401);
      assert.equal(refreshCalls, 1, 'Refresh must not loop endlessly');
    }
  });

  it('12. Safe GET transient retry on 503 error succeeds on subsequent attempt', async () => {
    let attempts = 0;

    globalThis.fetch = async () => {
      attempts++;
      if (attempts === 1) {
        return createMockResponse({ message: 'Service Unavailable' }, { status: 503 });
      }
      return createMockResponse({ recovered: true }, { status: 200 });
    };

    const res = await client.get<{ recovered: boolean }>('/apir/flaky', false, {
      retries: 2,
      retryDelayMs: 10,
    });

    assert.equal(attempts, 2);
    assert.deepEqual(res, { recovered: true });
  });

  it('13. POST request is NOT automatically retried on 503 by default', async () => {
    let postAttempts = 0;

    globalThis.fetch = async () => {
      postAttempts++;
      return createMockResponse({ message: 'Unavailable' }, { status: 503 });
    };

    try {
      await client.post('/apir/orders', { item: 1 }, false, { retryDelayMs: 10 });
      assert.fail('Should have thrown on 503');
    } catch (err) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 503);
      assert.equal(postAttempts, 1, 'Mutating POST must not be retried automatically');
    }
  });

  it('14. Request ID extraction from X-Request-Id response header', async () => {
    globalThis.fetch = async () => {
      return createMockResponse({ ok: true }, {
        status: 200,
        headers: { 'X-Request-Id': 'gateway-trace-456' },
      });
    };

    let capturedHeaders: Record<string, string> = {};
    globalThis.fetch = async (_, init) => {
      capturedHeaders = init?.headers as Record<string, string>;
      return createMockResponse({ ok: true }, {
        status: 200,
        headers: { 'X-Request-Id': 'gateway-trace-456' },
      });
    };

    await client.get('/apir/tracked', false, { requestId: 'client-corr-123' });

    assert.equal(capturedHeaders['X-Correlation-Id'], 'client-corr-123');
  });
});
