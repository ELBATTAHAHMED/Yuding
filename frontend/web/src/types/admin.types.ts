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
  hasProfilePhoto?: boolean;
}

export interface AdminStats {
  totalReservations: number;
  totalPayments: number;
  totalRevenue: number;
  totalRefunds: number;
  totalRefundedAmount: number;
  totalCancellations: number;
  bookingsByStatus?: Record<string, number>;
  bookingsByProduct?: Record<string, number>;
  paymentsByStatus?: Record<string, number>;
  paymentsByProvider?: Record<string, number>;
}

export interface AdminBooking {
  id: string;
  bookingReference: string;
  userId: string;
  productType: string;
  status: string;
  amount?: number | null;
  currency?: string | null;
  provider?: string | null;
  providerOfferId?: string | null;
  createdAt: string;
  updatedAt: string;
  statusChangedAt: string;
  expiresAt?: string | null;
  selectedDetails?: Record<string, any> | null;
}

export interface AdminPayment {
  id: string;
  bookingId: string;
  paymentReference: string;
  providerName: string;
  providerOrderId?: string | null;
  providerTransactionId?: string | null;
  amount: number;
  currency: string;
  status: string;
  paymentMethodType?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRefund {
  id: string;
  paymentId?: string | null;
  bookingId: string;
  refundReference: string;
  providerRefundId?: string | null;
  amount: number;
  currency: string;
  reason?: string | null;
  status: string;
  requestedBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AdminCancellation {
  id: string;
  bookingId: string;
  requestedBy: string;
  reason?: string | null;
  status: string;
  policyType?: string | null;
  providerName?: string | null;
  providerCancellationReference?: string | null;
  refundStatus?: string | null;
  refundAmount?: number | null;
  cancellationFee?: number | null;
  currency?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  refundedAt?: string | null;
}

export interface AdminAuditAction {
  id: number;
  adminUserId: string;
  actionType: string;
  targetService: string;
  targetEntityType: string;
  targetEntityId: string;
  reason?: string | null;
  metadataJson?: string | null;
  createdAt: string;
}

export interface AdminDestination {
  id: string;
  name: string;
  slug: string;
  city: string;
  countryCode: string;
  countryName: string;
  description?: string;
  heroImageUrl?: string;
  isActive: boolean;
}

export interface ProviderHealthStatus {
  name: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN' | 'DEGRADED';
  type: 'MICROSERVICE' | 'INFRASTRUCTURE' | 'TRAVEL_PROVIDER' | 'PAYMENT_GATEWAY';
  endpoint?: string;
  port?: number;
  details?: string;
  lastChecked: string;
}

export interface OperationalSettings {
  sandboxMode: boolean;
  maintenanceMode: boolean;
  autoReviewModeration: boolean;
  mockPaymentAllowed: boolean;
  redisCacheEnabled: boolean;
  rateLimitPerMinute: number;
}
