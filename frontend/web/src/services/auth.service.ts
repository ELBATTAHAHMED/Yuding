import { apiClient } from '../lib/api-client.ts';
import type {
  ActiveSession,
  AuthResponse,
  LoginRequest,
  MessageResponse,
  RegisterRequest,
  SecurityEvent,
  UserProfile,
  SavedTraveler,
} from '../types/auth.types.ts';

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

  async updateProfile(request: Pick<UserProfile, 'firstName' | 'lastName' | 'preferredCurrency' | 'preferredLanguage'>): Promise<UserProfile> {
    return apiClient.patch<UserProfile>('/api/account/me', request, true);
  },
  async resendVerification(): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>('/api/account/me/verification/resend', {}, true);
  },
  async getProfilePhoto(): Promise<Blob> { return apiClient.getBlob('/api/account/me/photo', true); },
  async uploadProfilePhoto(file: File): Promise<UserProfile> {
    const data = new FormData(); data.append('file', file);
    return apiClient.postForm<UserProfile>('/api/account/me/photo', data, true);
  },
  async removeProfilePhoto(): Promise<UserProfile> { return apiClient.delete<UserProfile>('/api/account/me/photo', true); },
  async getTravelers(): Promise<SavedTraveler[]> { return apiClient.get<SavedTraveler[]>('/api/account/travelers', true); },
  async createTraveler(input: Omit<SavedTraveler, 'reference'>): Promise<SavedTraveler> { return apiClient.post<SavedTraveler>('/api/account/travelers', input, true); },
  async updateTraveler(reference: string, input: Omit<SavedTraveler, 'reference'>): Promise<SavedTraveler> { return apiClient.put<SavedTraveler>(`/api/account/travelers/${encodeURIComponent(reference)}`, input, true); },
  async deleteTraveler(reference: string): Promise<void> { return apiClient.delete<void>(`/api/account/travelers/${encodeURIComponent(reference)}`, true); },

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

  async verifyEmail(token: string): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>('/auth/verify-email', { token });
  },

  async resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
    return apiClient.post<MessageResponse>('/auth/reset-password', { token, newPassword });
  },
};
