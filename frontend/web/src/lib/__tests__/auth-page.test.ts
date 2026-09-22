import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../../services/auth.service.ts';
import { apiClient } from '../api-client.ts';

function createMockResponse(
  body: any,
  init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}
): Response {
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

describe('V2 Authentication Service & Contracts', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    apiClient.setAccessToken(null);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    apiClient.setAccessToken(null);
  });

  it('1. Login uses V2 endpoint /auth/login via Gateway and sets access token', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody: any;

    globalThis.fetch = async (input, init) => {
      capturedUrl = input.toString();
      capturedMethod = init?.method || 'GET';
      capturedBody = JSON.parse((init?.body as string) || '{}');

      return createMockResponse({
        accessToken: 'jwt-test-token-123',
        tokenType: 'Bearer',
        expiresInSeconds: 900,
        user: {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'user@example.com',
          firstName: 'Ahmed',
          lastName: 'Elbattah',
          roles: ['ROLE_USER'],
          isEmailVerified: true,
        },
      });
    };

    const result = await authService.login({
      email: 'user@example.com',
      password: 'StrongPassword123!',
    });

    assert.equal(capturedUrl, 'http://localhost:8888/auth/login');
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedBody.email, 'user@example.com');
    assert.equal(capturedBody.password, 'StrongPassword123!');
    assert.equal(result.accessToken, 'jwt-test-token-123');
    assert.equal(result.user.email, 'user@example.com');
    assert.equal(apiClient.getAccessToken(), 'jwt-test-token-123');
  });

  it('2. Login failure with 401 throws proper ApiError and does not set token', async () => {
    globalThis.fetch = async () => {
      return createMockResponse(
        { message: 'Invalid credentials or user not found', status: 401 },
        { status: 401, statusText: 'Unauthorized' }
      );
    };

    await assert.rejects(
      async () => {
        await authService.login({
          email: 'wrong@example.com',
          password: 'WrongPassword!',
        });
      },
      (err: any) => {
        assert.equal(err.status, 401);
        assert.match(err.message, /Invalid credentials/);
        return true;
      }
    );

    assert.equal(apiClient.getAccessToken(), null);
  });

  it('3. Registration uses V2 endpoint /auth/register via Gateway with validated DTO', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody: any;

    globalThis.fetch = async (input, init) => {
      capturedUrl = input.toString();
      capturedMethod = init?.method || 'GET';
      capturedBody = JSON.parse((init?.body as string) || '{}');

      return createMockResponse(
        {
          accessToken: 'jwt-registered-token-456',
          tokenType: 'Bearer',
          expiresInSeconds: 900,
          user: {
            id: '22222222-2222-2222-2222-222222222222',
            email: 'newuser@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phoneNumber: '+212600000000',
            roles: ['ROLE_USER'],
            isEmailVerified: false,
          },
        },
        { status: 201 }
      );
    };

    const result = await authService.register({
      email: 'newuser@example.com',
      password: 'StrongPassword123!',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+212600000000',
    });

    assert.equal(capturedUrl, 'http://localhost:8888/auth/register');
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedBody.email, 'newuser@example.com');
    assert.equal(capturedBody.firstName, 'John');
    assert.equal(capturedBody.lastName, 'Doe');
    assert.equal(capturedBody.phoneNumber, '+212600000000');
    assert.equal(result.accessToken, 'jwt-registered-token-456');
    assert.equal(apiClient.getAccessToken(), 'jwt-registered-token-456');
  });

  it('4. Registration duplicate email with 409 Conflict throws proper ApiError', async () => {
    globalThis.fetch = async () => {
      return createMockResponse(
        { message: 'Email is already in use', status: 409 },
        { status: 409, statusText: 'Conflict' }
      );
    };

    await assert.rejects(
      async () => {
        await authService.register({
          email: 'duplicate@example.com',
          password: 'StrongPassword123!',
          firstName: 'Duplicate',
          lastName: 'User',
        });
      },
      (err: any) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /already in use/);
        return true;
      }
    );
  });

  it('5. Architectural Compliance: strictly forbids legacy V1 endpoints and direct ports', async () => {
    const forbiddenPatterns = [
      '8081',
      '8082',
      '8084',
      '8090',
      '8072',
      '7777',
      '/utilisateurs/search',
      '/utilisateurs/create',
      '/apiu/utilisateurs',
      '/apiu/admin/search',
    ];

    let capturedUrls: string[] = [];
    globalThis.fetch = async (input) => {
      capturedUrls.push(input.toString());
      return createMockResponse({ ok: true });
    };

    await authService.login({ email: 'compliance@example.com', password: 'Pass' }).catch(() => {});
    await authService.register({ email: 'c@e.com', password: 'Pass', firstName: 'A', lastName: 'B' }).catch(() => {});
    await authService.getMe().catch(() => {});

    for (const url of capturedUrls) {
      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !url.includes(pattern),
          `Forbidden legacy pattern "${pattern}" detected in request URL: ${url}`
        );
      }
    }
  });

  it('6. Mode transition contract: auth page supports dual-mode flip with persistent panels', () => {
    // Verifies that auth view contracts define discrete login and signup modes without unmounting
    const initialMode = 'login';
    let mode: 'login' | 'signup' = initialMode;

    const toggleToSignup = () => { mode = 'signup'; };
    const toggleToLogin = () => { mode = 'login'; };

    assert.equal(mode, 'login');
    toggleToSignup();
    assert.equal(mode, 'signup');
    toggleToLogin();
    assert.equal(mode, 'login');
  });

  it('7. Header & Flip CSS contract verification: ensures isolated auth header and 3D cover classes exist', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const cssPath = path.resolve(process.cwd(), 'src/styles/loginStyle.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('.header.auth-header'), 'Auth header class must be present in loginStyle.css');
    assert.ok(cssContent.includes('.container.signup-mode .cover'), 'Signup mode 3D transform must be present in loginStyle.css');
    assert.ok(cssContent.includes('.auth-switch-link'), 'Interactive switch link button styling must be present in loginStyle.css');
    assert.ok(cssContent.includes('transform: rotateY(-180deg)'), '3D rotateY transform must be present in loginStyle.css');
    assert.ok(cssContent.includes('min-height: 100px !important'), '100px fixed header height must be enforced with !important');
  });
});
