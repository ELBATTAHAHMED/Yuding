'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { queryKeys } from '@/lib/query-keys';
import { AdminStats, AdminUserSummary } from '@/types/admin.types';

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

export function useAdminRecentReservations(options?: { enabled?: boolean }) {
  return useQuery<any[]>({
    queryKey: queryKeys.admin.reservations(),
    queryFn: () => adminService.getRecentReservations(),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminRecentPayments(options?: { enabled?: boolean }) {
  return useQuery<any[]>({
    queryKey: queryKeys.admin.payments(),
    queryFn: () => adminService.getRecentPayments(),
    enabled: options?.enabled ?? true,
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

export function useUnlockUserMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: (userId: string) => adminService.unlockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
    },
  });
}
