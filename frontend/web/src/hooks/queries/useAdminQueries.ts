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

export function useAdminBookings(filters?: { limit?: number; status?: string; productType?: string }) {
  return useQuery<AdminBooking[]>({
    queryKey: ['admin', 'bookings', filters?.limit, filters?.status, filters?.productType],
    queryFn: () => adminService.getBookings(filters?.limit, filters?.status, filters?.productType),
  });
}

export function useAdminPayments(filters?: { limit?: number; status?: string }) {
  return useQuery<AdminPayment[]>({
    queryKey: ['admin', 'payments', filters?.limit, filters?.status],
    queryFn: () => adminService.getPayments(filters?.limit, filters?.status),
  });
}

export function useAdminRefunds(limit: number = 50) {
  return useQuery<AdminRefund[]>({
    queryKey: ['admin', 'refunds', limit],
    queryFn: () => adminService.getRefunds(limit),
  });
}

export function useAdminCancellations(limit: number = 50) {
  return useQuery<AdminCancellation[]>({
    queryKey: ['admin', 'cancellations', limit],
    queryFn: () => adminService.getCancellations(limit),
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

  return useMutation<AdminCancellation, Error, string>({
    mutationFn: (cancellationId: string) => adminService.retryRefund(cancellationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'cancellations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'refunds'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}
