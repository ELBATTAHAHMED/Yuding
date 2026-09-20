import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

export const defaultQueryClientOptions: DefaultOptions = {
  queries: {
    // Conservative retry policy: apiClient (Phase 16) handles transport-level
    // transient retries and 401 token refresh; do NOT duplicate retries here.
    retry: false,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
  mutations: {
    retry: false, // Mutating actions must never auto-retry
  },
};

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryClientOptions,
  });
}
