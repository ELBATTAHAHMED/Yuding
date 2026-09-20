'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { queryKeys } from '@/lib/query-keys';
import { ActiveSession, SecurityEvent, MessageResponse } from '@/types/auth.types';

export function useActiveSessions(options?: { enabled?: boolean }) {
  return useQuery<ActiveSession[]>({
    queryKey: queryKeys.auth.sessions(),
    queryFn: () => authService.getActiveSessions(),
    enabled: options?.enabled ?? true,
  });
}

export function useSecurityEvents(options?: { enabled?: boolean }) {
  return useQuery<SecurityEvent[]>({
    queryKey: queryKeys.auth.securityEvents(),
    queryFn: () => authService.getSecurityEvents(),
    enabled: options?.enabled ?? true,
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation<MessageResponse, Error, string>({
    mutationFn: (sessionId: string) => authService.revokeSession(sessionId),
    onSuccess: () => {
      // Invalidate both active sessions and audit security events
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.securityEvents() });
    },
  });
}

export function useLogoutAllMutation() {
  const queryClient = useQueryClient();

  return useMutation<MessageResponse, Error, void>({
    mutationFn: () => authService.logoutAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() });
    },
  });
}

export function useChangePasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation<MessageResponse, Error, { currentPassword: string; newPassword: string }>({
    mutationFn: ({ currentPassword, newPassword }) =>
      authService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.securityEvents() });
    },
  });
}
