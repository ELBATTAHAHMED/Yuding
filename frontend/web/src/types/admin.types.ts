export interface AdminUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  countryCode?: string;
  status: string;
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil?: string;
  roles: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface AdminStats {
  totalReservations: number;
  totalPayments: number;
  totalRevenue: number;
  totalHebergements: number;
  totalTransports: number;
  totalActivites: number;
}
