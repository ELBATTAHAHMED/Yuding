import { apiClient } from "@/lib/api-client";
import { displayFeaturedText } from "@/lib/featured-destinations";
import {
  AdminStats,
  AdminUserSummary,
  AdminBooking,
  AdminPayment,
  AdminRefund,
  AdminCancellation,
  AdminAuditAction,
  AdminDestination,
  ProviderHealthStatus,
  OperationalSettings,
  AdminPagedResponse,
} from "@/types/admin.types";
export interface AdminFilters {
  page?: number;
  size?: number;
  limit?: number;
  status?: string;
  productType?: string;
  provider?: string;
  role?: string;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
  userId?: string;
  bookingId?: string;
  sort?: string;
  type?: string;
  target?: string;
}
export function adminQuery(params: AdminFilters = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "" && v !== "ALL") q.set(k, String(v));
  });
  return q.toString();
}
const paged = <T>(path: string, p: AdminFilters = {}) =>
  apiClient.get<AdminPagedResponse<T>>(
    `${path}?${adminQuery({ ...p, page: p.page ?? 0, size: p.size ?? p.limit ?? 25 })}`,
    true,
  );
export interface AdminIncident {
  id: string;
  title: string;
  context: string;
  href: string;
  createdAt: string;
}
export const adminService = {
  getAllUsers: () => apiClient.get<AdminUserSummary[]>("/admin/users", true),
  getUsers: (p: AdminFilters = {}) =>
    paged<AdminUserSummary>("/admin/users/page", p),
  getUser: (id: string) =>
    apiClient.get<AdminUserSummary>(
      `/admin/users/${encodeURIComponent(id)}`,
      true,
    ),
  updateUserRoles: (id: string, roles: string[]) =>
    apiClient.put<AdminUserSummary>(
      `/admin/users/${id}/roles`,
      { roles },
      true,
    ),
  updateUserStatus: (id: string, status: string) =>
    apiClient.put<AdminUserSummary>(
      `/admin/users/${id}/status`,
      { status },
      true,
    ),
  unlockUser: (id: string) =>
    apiClient.post<{ message: string }>(`/admin/users/${id}/unlock`, {}, true),
  suspendUser: (id: string, reason?: string) =>
    apiClient.put<AdminUserSummary>(
      `/admin/users/${id}/status`,
      { status: "SUSPENDED", reason },
      true,
    ),
  reactivateUser: (id: string) =>
    apiClient.put<AdminUserSummary>(
      `/admin/users/${id}/status`,
      { status: "ACTIVE" },
      true,
    ),
  getAdminStats: () => apiClient.get<AdminStats>("/apir/admin/summary", true),
  getBookings: (p: AdminFilters = {}) =>
    paged<AdminBooking>("/apir/admin/dossiers", p),
  getBooking: (id: string) =>
    apiClient.get<AdminBooking>(
      `/apir/admin/bookings/${encodeURIComponent(id)}`,
      true,
    ),
  getPayments: (p: AdminFilters = {}) =>
    paged<AdminPayment>("/apir/admin/ledger", p),
  getPayment: (id: string) =>
    apiClient.get<AdminPayment>(
      `/apir/admin/payments/${encodeURIComponent(id)}`,
      true,
    ),
  getRefunds: (p: AdminFilters | number = {}) =>
    paged<AdminRefund>(
      "/apir/admin/refund-ledger",
      typeof p === "number" ? { size: p } : p,
    ),
  getRefund: (id: string) =>
    apiClient.get<AdminRefund>(
      `/apir/admin/refunds/${encodeURIComponent(id)}`,
      true,
    ),
  getCancellations: (p: AdminFilters | number = {}) =>
    paged<AdminCancellation>(
      "/apir/admin/cancellation-ledger",
      typeof p === "number" ? { size: p } : p,
    ),
  getCancellation: (id: string) =>
    apiClient.get<AdminCancellation>(
      `/apir/admin/cancellations/${encodeURIComponent(id)}`,
      true,
    ),
  retryRefund: (id: string) =>
    apiClient.post<unknown>(
      `/apir/admin/cancellations/${id}/retry-refund`,
      {},
      true,
    ),
  getAttention: () =>
    apiClient.get<AdminIncident[]>("/apir/admin/attention", true),
  getAuditLogs: (limit = 50) =>
    apiClient.get<AdminAuditAction[]>(
      `/admin/users/audit-logs?limit=${limit}`,
      true,
    ),
  getAuditPage: (p: AdminFilters = {}) =>
    paged<AdminAuditAction>("/admin/users/audit-page", p),
  getAuditEvent: (id: string) =>
    apiClient.get<AdminAuditAction>(
      `/admin/users/audit-events/${encodeURIComponent(id)}`,
      true,
    ),
  getDestinations: () =>
    apiClient.get<AdminDestination[]>("/travel/destinations", true),

  // Phase 53: Real Supervision, API Usage & AI Usage Telemetry
  getSupervision: () =>
    apiClient.get<import("@/types/admin.types").PlatformSupervisionResponse>(
      "/apir/admin/supervision",
      true,
    ),
  getApiUsage: () =>
    apiClient.get<import("@/types/admin.types").ApiUsageResponse>(
      "/apir/admin/api-usage",
      true,
    ),
  getAiUsage: () =>
    apiClient.get<import("@/types/admin.types").AiUsageResponse>(
      "/api/ai/admin/usage",
      true,
    ),

  // Phase 53: Real Settings via identity-service
  getSettings: () =>
    apiClient.get<import("@/types/admin.types").PlatformSettingItem[]>(
      "/admin/settings",
      true,
    ),
  updateSettings: (settings: Record<string, string>) =>
    apiClient.put<import("@/types/admin.types").PlatformSettingItem[]>(
      "/admin/settings",
      { settings },
      true,
    ),

  // Content management: featured destinations
  getFeaturedDestinations: async () => {
    type Destination = import("@/types/admin.types").FeaturedDestinationItem;
    const items = await apiClient.get<(Destination & { line?: string; detail?: string })[]>(
      "/travel/admin/content/destinations/featured",
      true,
    );
    return items.map((item) => ({ ...item, editorialTitle: displayFeaturedText(item.editorialTitle), editorialLine: displayFeaturedText(item.editorialLine ?? item.line), editorialDetail: displayFeaturedText(item.editorialDetail ?? item.detail) }));
  },
  saveFeaturedDestination: (dest: Partial<import("@/types/admin.types").FeaturedDestinationItem>) =>
    dest.id
      ? apiClient.put<{ id: string; message: string }>(
          `/travel/admin/content/destinations/featured/${dest.id}`,
          dest,
          true,
        )
      : apiClient.post<{ id: string; message: string }>(
          "/travel/admin/content/destinations/featured",
          dest,
          true,
        ),
  archiveFeaturedDestination: (id: string) =>
    apiClient.delete<void>(
      `/travel/admin/content/destinations/featured/${encodeURIComponent(id)}`,
      true,
    ),
  getProviderHealth: async (): Promise<ProviderHealthStatus[]> => {
    throw new Error("Télémétrie temps réel non disponible.");
  },
  getOperationalSettings: (): OperationalSettings => {
    throw new Error("Configuration serveur indisponible.");
  },
  saveOperationalSettings: (_settings: OperationalSettings) => {
    throw new Error("Configuration serveur indisponible.");
  },
};
