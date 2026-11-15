export interface AdminPagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

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
  revenueByCurrency?: Record<string, number>;
  refundedByCurrency?: Record<string, number>;
  totalReservations: number;
  totalPayments: number;
  totalRevenue: number;
  totalRefunds: number;
  totalRefundedAmount: number;
  totalCancellations: number;
  bookingsByStatus?: Record<string, number>;
  bookingsByProduct?: Record<string, number>;
  paymentsByStatus?: Record<string, number>;
  pendingPaymentsPastDue?: number;
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
  pastDue?: boolean;
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
  retryEligible?: boolean;
  failureMessage?: string | null;
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

export interface SupervisionServiceInfo {
  serviceName: string;
  status: 'HEALTHY' | 'UNAVAILABLE';
  instanceCount: number;
  port: number;
  host: string;
}

export interface SupervisionProviderInfo {
  providerCode: string;
  providerName: string;
  domain: 'TRAVEL' | 'PAYMENT';
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNMEASURED';
  telemetryMode: string;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  lastSeenAt?: string | null;
  notes: string;
}

export interface PlatformSupervisionResponse {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  services: SupervisionServiceInfo[];
  infrastructure: Array<{ component: string; status: string; latencyMs: number }>;
  providers: SupervisionProviderInfo[];
}

export interface ApiUsageResponse {
  timestamp: string;
  bookingsByProvider: Array<{
    provider: string;
    productType: string;
    total: number;
    lastSeen: string;
  }>;
  paymentsByProvider: Array<{
    providerName: string;
    status: string;
    total: number;
    totalAmount: number;
    currency: string;
  }>;
  webhookEvents: Array<{
    provider: string;
    eventType: string;
    status: string;
    total: number;
  }>;
}

export interface AiUsageResponse {
  timestamp: string;
  volume: { totalConversations: number; activeConversations: number; totalMessages: number };
  tokens: { totalTokens: number; tokensToday: number; tokensLast7Days: number; tokensLast30Days: number; costNotice: string };
  toolCalls: Array<{ tool_name: string; total_calls: number; successful_calls: number; failed_calls: number; avg_duration_ms: number | null }>;
}

export interface PlatformSettingItem {
  key: string;
  value: string;
  description: string;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface FeaturedDestinationItem {
  id: string;
  city: string;
  country: string;
  countryLabel: string;
  editorialTitle: string;
  editorialLine: string;
  editorialDetail: string;
  imageId?: string;
  imageUrl?: string;
  targetUrl: string;
  displayOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt?: string;
  updatedAt?: string;
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
