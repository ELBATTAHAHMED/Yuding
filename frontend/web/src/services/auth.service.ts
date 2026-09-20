import { apiClient } from '@/lib/api-client';
import {
  ActiveSession,
  AuthResponse,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  SecurityEvent,
  UserProfile,
} from '@/types/auth.types';

export const authService = {
  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', request);
    if (response.accessToken) {
      apiClient.setAccessToken(response.accessToken);
    }
    return response;
  },

  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', request);
    if (response.accessToken) {
      apiClient.setAccessToken(response.accessToken);
    }
    return response;
  },

  async getMe(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/auth/me', true);
  },

  async refresh(): Promise<string | null> {
    const token = await apiClient.refreshToken();
    if (token) {
      apiClient.setAccessToken(token);
    }
    return token;
  },

  async logout(): Promise<MessageResponse> {
    try {
      return await apiClient.post<MessageResponse>('/auth/logout', {}, true);
    } finally {
      apiClient.setAccessToken(null);
    }
  },

  async logoutAll(): Promise<MessageResponse> {
    try {
      return await apiClient.post<MessageResponse>('/auth/logout-all', {}, true);
    } finally {
      apiClient.setAccessToken(null);
    }
  },

  async getActiveSessions(): Promise<ActiveSession[]> {
    return apiClient.get<ActiveSession[]>('/auth/sessions', true);
  },

  async revokeSession(sessionId: string): Promise<MessageResponse> {
    return apiClient.delete<MessageResponse>(`/auth/sessions/${sessionId}`, true);
  },

  async getSecurityEvents(): Promise<SecurityEvent[]> {
    return apiClient.get<SecurityEvent[]>('/auth/security-events', true);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>(
      '/auth/change-password',
      { currentPassword, newPassword },
      true
    );
  },

  async forgotPassword(email: string): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>('/auth/forgot-password', { email });
  },
};
