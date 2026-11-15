'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
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
} from '@/types/admin.types';

export function useAdminUsers(options?: { enabled?: boolean }) {
  return useQuery<AdminUserSummary[]>({
    queryKey: queryKeys.admin.users(),
    queryFn: () => adminService.getAllUsers(),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminStats(options?: { enabled?: boolean }) {
  return useQuery<AdminStats>({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => adminService.getAdminStats(),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminBookings(filters?: {
  page?: number;
  size?: number;
  limit?: number;
  status?: string;
  productType?: string;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
}) {
  return useQuery<AdminPagedResponse<AdminBooking>>({
    queryKey: [
      'admin',
      'bookings',
      filters?.page,
      filters?.size,
      filters?.limit,
      filters?.status,
      filters?.productType,
      filters?.q,
      filters?.createdFrom,
      filters?.createdTo,
    ],
    queryFn: () => adminService.getBookings(filters),
  });
}

export function useAdminPayments(filters?: {
  page?: number;
  size?: number;
  limit?: number;
  status?: string;
  provider?: string;
  q?: string;
  createdFrom?: string;
  createdTo?: string;
}) {
  return useQuery<AdminPagedResponse<AdminPayment>>({
    queryKey: [
      'admin',
      'payments',
      filters?.page,
      filters?.size,
      filters?.limit,
      filters?.status,
      filters?.provider,
      filters?.q,
      filters?.createdFrom,
      filters?.createdTo,
    ],
    queryFn: () => adminService.getPayments(filters),
  });
}

export function useAdminRefunds(filters?: { page?: number; size?: number; limit?: number; q?: string } | number) {
  const norm = typeof filters === 'number' ? { limit: filters } : filters;
  return useQuery<AdminPagedResponse<AdminRefund>>({
    queryKey: ['admin', 'refunds', norm?.page, norm?.size, norm?.limit, norm?.q],
    queryFn: () => adminService.getRefunds(filters),
  });
}

export function useAdminCancellations(filters?: { page?: number; size?: number; limit?: number; q?: string } | number) {
  const norm = typeof filters === 'number' ? { limit: filters } : filters;
  return useQuery<AdminPagedResponse<AdminCancellation>>({
    queryKey: ['admin', 'cancellations', norm?.page, norm?.size, norm?.limit, norm?.q],
    queryFn: () => adminService.getCancellations(filters),
  });
}

export function useAdminAuditLogs(limit: number = 50) {
  return useQuery<AdminAuditAction[]>({
    queryKey: ['admin', 'audit-logs', limit],
    queryFn: () => adminService.getAuditLogs(limit),
  });
}

export function useAdminDestinations() {
  return useQuery<AdminDestination[]>({
    queryKey: ['admin', 'destinations'],
    queryFn: () => adminService.getDestinations(),
  });
}

export function useProviderHealth() {
  return useQuery<ProviderHealthStatus[]>({
    queryKey: ['admin', 'providers', 'health'],
    queryFn: () => adminService.getProviderHealth(),
    refetchInterval: 30000,
  });
}

export function useUpdateUserRolesMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserSummary, Error, { userId: string; roles: string[] }>({
    mutationFn: ({ userId, roles }) => adminService.updateUserRoles(userId, roles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}

export function useUpdateUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserSummary, Error, { userId: string; status: string }>({
    mutationFn: ({ userId, status }) => adminService.updateUserStatus(userId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}

export function useUnlockUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (userId: string) => adminService.unlockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}

export function useSuspendUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserSummary, Error, { userId: string; reason?: string }>({
    mutationFn: ({ userId, reason }) => adminService.suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}

export function useReactivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<AdminUserSummary, Error, string>({
    mutationFn: (userId: string) => adminService.reactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}

export function useRetryRefundMutation() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: (cancellationId: string) => adminService.retryRefund(cancellationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'cancellations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}
