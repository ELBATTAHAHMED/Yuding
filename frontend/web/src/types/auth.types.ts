export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  countryCode?: string;
  roles: string[];
  status?: string;
  isEmailVerified: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  countryCode?: string;
}

export interface ActiveSession {
  sessionId: string;
  deviceLabel: string;
  ipAddressMasked: string;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

export interface SecurityEvent {
  id: number;
  eventType: string;
  ipAddressMasked: string;
  deviceLabel?: string;
  failureReason?: string;
  riskScore: number;
  createdAt: string;
}

export interface MessageResponse {
  message: string;
}
