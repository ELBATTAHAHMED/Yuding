/**
 * Yuding V2 - Central API Client
 *
 * Single, authoritative transport abstraction for all frontend API communication
 * routed via the API Gateway (gateway-service, port 8888).
 *
 * Capabilities:
 * - Configurable Gateway base URL via NEXT_PUBLIC_API_BASE_URL (defaults to http://localhost:8888)
 * - In-memory access token storage (never written to localStorage/sessionStorage)
 * - HttpOnly refresh cookie transmission (credentials: 'include')
 * - Single-flight 401 token refresh mechanism (concurrent requests share one refresh call)
 * - Infinite refresh loop prevention
 * - Request timeout via AbortController (distinguishable from network and HTTP errors)
 * - Normalized typed ApiError model with status, errorCode, validation details, and requestId
 * - Request correlation ID tracking (X-Request-Id / X-Correlation-Id)
 * - Conservative, idempotency-aware retry policy (GET/HEAD transient retries; safe backoff)
 */

export interface ApiErrorDetails {
  message: string;
  status: number;
  errorCode?: string;
  requestId?: string;
  validationErrors?: Record<string, string[]> | any;
  isTimeout?: boolean;
  isNetwork?: boolean;
  isAuthError?: boolean;
  data?: any;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode?: string;
  public readonly requestId?: string;
  public readonly validationErrors?: Record<string, string[]> | any;
  public readonly isTimeout: boolean;
  public readonly isNetwork: boolean;
  public readonly isAuthError: boolean;
  public readonly data?: any;

  constructor(details: ApiErrorDetails) {
    super(details.message);
    this.name = 'ApiError';
    this.status = details.status;
    this.errorCode = details.errorCode;
    this.requestId = details.requestId;
    this.validationErrors = details.validationErrors;
    this.isTimeout = Boolean(details.isTimeout);
    this.isNetwork = Boolean(details.isNetwork);
    this.isAuthError = Boolean(details.isAuthError || details.status === 401 || details.status === 403);
    this.data = details.data;

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      errorCode: this.errorCode,
      requestId: this.requestId,
      validationErrors: this.validationErrors,
      isTimeout: this.isTimeout,
      isNetwork: this.isNetwork,
      isAuthError: this.isAuthError,
      data: this.data,
    };
  }
}

export interface RequestOptions extends RequestInit {
  responseType?: 'blob';
  timeoutMs?: number;
  requiresAuth?: boolean;
  retries?: number;
  retryDelayMs?: number;
  retryable?: boolean;
  requestId?: string;
  isRetry?: boolean;
  idempotencyKey?: string;
}

import { env } from './env.ts';

const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  private defaultTimeoutMs: number = 15000;
  private defaultRetryDelayMs: number = 300;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || env.apiBaseUrl || 'http://localhost:8888').replace(/\/+$/, '');
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Single-flight token refresh.
   * If a refresh is already in progress, all subsequent callers receive the same Promise.
   */
  public async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          credentials: 'include',
        });

        if (!res.ok) {
          this.setAccessToken(null);
          return null;
        }

        const data = await res.json();
        const newToken = data.accessToken || null;
        this.setAccessToken(newToken);
        return newToken;
      } catch {
        this.setAccessToken(null);
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Core request execution with timeout, authentication header injection,
   * single-flight 401 refresh, and conservative transient retry policy.
   */
  public async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    requiresAuth: boolean = false
  ): Promise<T> {
    const shouldAuthenticate = requiresAuth || options.requiresAuth || false;
    const method = (options.method || 'GET').toUpperCase();
    const isSafeMethod = SAFE_HTTP_METHODS.has(method);
    const isExplicitlyRetryable = options.retryable === true;
    const allowsRetries = isSafeMethod || isExplicitlyRetryable;
    const maxRetries = options.retries !== undefined ? options.retries : allowsRetries ? 2 : 0;
    const retryDelay = options.retryDelayMs || this.defaultRetryDelayMs;

    let attempt = 0;

    while (true) {
      try {
        return await this.executeSingleRequest<T>(endpoint, options, shouldAuthenticate);
      } catch (error) {
        if (!(error instanceof ApiError)) {
          throw error;
        }

        // Check if this error is eligible for conservative transient retry
        const isTransientStatus = TRANSIENT_STATUS_CODES.has(error.status);
        const isTransientNetwork = error.isNetwork;
        const isRetryableError = allowsRetries && (isTransientStatus || isTransientNetwork);

        if (isRetryableError && attempt < maxRetries && !options.isRetry) {
          attempt++;
          const backoff = Math.min(attempt * retryDelay, 2000);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }

        throw error;
      }
    }
  }

  private async executeSingleRequest<T>(
    endpoint: string,
    options: RequestOptions,
    requiresAuth: boolean
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const timeoutMs = options.timeoutMs ?? this.defaultTimeoutMs;

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.accessToken && requiresAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (options.requestId) {
      headers['X-Correlation-Id'] = options.requestId;
    }

    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    // Configure AbortController for timeout handling
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    }

    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        controller.abort(options.signal?.reason);
      });
    }

    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });
    } catch (err: any) {
      if (controller.signal.aborted) {
        throw new ApiError({
          message: `Request timed out after ${timeoutMs}ms`,
          status: 0,
          errorCode: 'REQUEST_TIMEOUT',
          isTimeout: true,
          requestId: options.requestId,
        });
      }

      // Network unreachable / DNS / connection refused error
      throw new ApiError({
        message: err.message || 'Network error: Unable to reach API gateway',
        status: 0,
        errorCode: 'NETWORK_ERROR',
        isNetwork: true,
        requestId: options.requestId,
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }

    // Extract request/correlation ID from response headers
    const requestId =
      response.headers.get('X-Request-Id') ||
      response.headers.get('X-Correlation-Id') ||
      response.headers.get('x-request-id') ||
      response.headers.get('x-correlation-id') ||
      options.requestId ||
      undefined;

    // Handle 401 Unauthorized with single-flight refresh on authenticated endpoints
    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');
    if (response.status === 401 && requiresAuth && !isAuthEndpoint && !options.isRetry) {
      const newToken = await this.refreshToken();

      if (newToken) {
        // Retry the original request exactly once with the new token
        return this.request<T>(
          endpoint,
          {
            ...options,
            isRetry: true,
            headers: {
              ...headers,
              Authorization: `Bearer ${newToken}`,
            },
          },
          true
        );
      } else {
        // Refresh failed: token invalid or expired
        this.setAccessToken(null);
        throw new ApiError({
          message: 'Session expired. Please sign in again.',
          status: 401,
          errorCode: 'UNAUTHORIZED',
          requestId,
          isAuthError: true,
        });
      }
    }

    // Non-2xx responses: parse error payload
    if (!response.ok) {
      let errorBody: any = null;
      try {
        const text = await response.text();
        errorBody = text ? JSON.parse(text) : null;
      } catch {
        errorBody = null;
      }

      const errorCode = errorBody?.code || errorBody?.errorCode || (typeof errorBody?.error === 'string' ? errorBody.error : undefined);
      const validationErrors = errorBody?.errors || errorBody?.validationErrors || errorBody?.details;
      const message =
        errorBody?.message ||
        (typeof errorBody?.error === 'string' ? errorBody.error : null) ||
        `Request failed with status ${response.status}`;

      throw new ApiError({
        message,
        status: response.status,
        errorCode,
        requestId: errorBody?.requestId || requestId,
        validationErrors,
        isAuthError: response.status === 401 || response.status === 403,
        data: errorBody,
      });
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    if (options.responseType === 'blob') {
      return await response.blob() as T;
    }

    // Parse JSON body or return plain text
    const responseText = await response.text();
    if (!responseText) {
      return {} as T;
    }

    try {
      return JSON.parse(responseText) as T;
    } catch {
      return responseText as unknown as T;
    }
  }

  // Convenience HTTP method helpers
  public get<T>(endpoint: string, requiresAuth = false, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' }, requiresAuth);
  }

  public getBlob(endpoint: string, requiresAuth = false, options: RequestOptions = {}): Promise<Blob> {
    return this.request<Blob>(endpoint, { ...options, method: 'GET', responseType: 'blob', headers: { ...((options.headers as Record<string, string>) || {}), Accept: '*/*' } }, requiresAuth);
  }

  public post<T>(endpoint: string, body?: any, requiresAuth = false, options: RequestOptions = {}): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
      },
      requiresAuth
    );
  }

  public postForm<T>(endpoint: string, formData: FormData, requiresAuth = false, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: formData,
      },
      requiresAuth
    );
  }

  public put<T>(endpoint: string, body?: any, requiresAuth = false, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PUT',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      requiresAuth
    );
  }

  public patch<T>(endpoint: string, body?: any, requiresAuth = false, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PATCH',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      requiresAuth
    );
  }

  public delete<T>(endpoint: string, requiresAuth = false, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' }, requiresAuth);
  }

  public async head(endpoint: string, requiresAuth = false, options: RequestOptions = {}): Promise<Headers> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken && requiresAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      method: 'HEAD',
      headers,
      credentials: 'include',
    });

    return response.headers;
  }
}

export const apiClient = new ApiClient();
