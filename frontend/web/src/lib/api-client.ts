export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string | null) => void)[] = [];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8888';
  }

  public setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  private onTokenRefreshed(token: string | null) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string | null) => void) {
    this.refreshSubscribers.push(cb);
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requiresAuth: boolean = false
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Includes HttpOnly refresh token cookie
    };

    let response = await fetch(url, config);

    // Auto-refresh token if 401 is encountered on authenticated endpoint
    if (response.status === 401 && requiresAuth && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const newToken = await this.refreshToken();
          this.setAccessToken(newToken);
          this.isRefreshing = false;
          this.onTokenRefreshed(newToken);

          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, { ...config, headers });
          }
        } catch (err) {
          this.isRefreshing = false;
          this.setAccessToken(null);
          this.onTokenRefreshed(null);
          throw err;
        }
      } else {
        // Wait for current refresh to complete
        const retryToken = await new Promise<string | null>((resolve) => {
          this.addRefreshSubscriber((token) => resolve(token));
        });
        if (retryToken) {
          headers['Authorization'] = `Bearer ${retryToken}`;
          response = await fetch(url, { ...config, headers });
        }
      }
    }

    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { message: response.statusText };
      }
      const message = errorBody?.message || errorBody?.error || `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, errorBody);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  public async refreshToken(): Promise<string | null> {
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
        return null;
      }

      const data = await res.json();
      return data.accessToken || null;
    } catch {
      return null;
    }
  }

  public get<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, requiresAuth);
  }

  public post<T>(endpoint: string, body?: any, requiresAuth = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      requiresAuth
    );
  }

  public put<T>(endpoint: string, body?: any, requiresAuth = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      requiresAuth
    );
  }

  public delete<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, requiresAuth);
  }
}

export const apiClient = new ApiClient();
