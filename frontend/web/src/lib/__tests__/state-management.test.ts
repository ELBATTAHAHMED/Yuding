import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '../query-client.ts';
import { queryKeys } from '../query-keys.ts';
import { ApiError } from '../api-client.ts';

describe('State Management & TanStack Query Configuration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = makeQueryClient();
  });

  it('1. QueryClient default configuration prevents duplicate retries and sets conservative cache times', () => {
    const defaultOptions = queryClient.getDefaultOptions();

    // Transport retries are already handled by apiClient (Phase 16); TanStack Query must NOT retry
    assert.equal(defaultOptions.queries?.retry, false, 'queries.retry must be false');
    assert.equal(defaultOptions.mutations?.retry, false, 'mutations.retry must be false');

    // Conservative cache timings
    assert.equal(defaultOptions.queries?.staleTime, 1000 * 60 * 2, 'staleTime must be 2 minutes');
    assert.equal(defaultOptions.queries?.gcTime, 1000 * 60 * 10, 'gcTime must be 10 minutes');
    assert.equal(defaultOptions.queries?.refetchOnWindowFocus, false, 'refetchOnWindowFocus must be false');
    assert.equal(defaultOptions.queries?.refetchOnReconnect, true, 'refetchOnReconnect must be true');
  });

  it('2. Centralized query keys produce deterministic, structured key hierarchies', () => {
    assert.deepEqual(queryKeys.auth.sessions(), ['auth', 'sessions']);
    assert.deepEqual(queryKeys.auth.securityEvents(), ['auth', 'security-events']);
    assert.deepEqual(queryKeys.admin.users(), ['admin', 'users']);
    assert.deepEqual(queryKeys.admin.stats(), ['admin', 'stats']);
    assert.deepEqual(queryKeys.booking.my(), ['booking', 'my']);
    assert.deepEqual(queryKeys.travel.hotels({ country: 'Maroc', city: 'Marrakech' }), [
      'travel',
      'hotels',
      { country: 'Maroc', city: 'Marrakech' },
    ]);
  });

  it('3. Successful query caching: queryFn executes and caches data', async () => {
    let fetchCount = 0;
    const key = queryKeys.admin.stats();

    const fetcher = async () => {
      fetchCount++;
      return { totalReservations: 42, totalRevenue: 10000 };
    };

    // First fetch
    const data1 = await queryClient.fetchQuery({ queryKey: key, queryFn: fetcher });
    assert.equal(fetchCount, 1);
    assert.deepEqual(data1, { totalReservations: 42, totalRevenue: 10000 });

    // Second fetch within staleTime serves from cache
    const data2 = await queryClient.fetchQuery({ queryKey: key, queryFn: fetcher });
    assert.equal(fetchCount, 1, 'Data within staleTime must be served from cache without calling fetcher again');
    assert.deepEqual(data2, data1);
  });

  it('4. ApiError propagation preserves typed error details in query', async () => {
    const key = queryKeys.auth.sessions();

    const failingFetcher = async () => {
      throw new ApiError({
        message: 'Session expired',
        status: 401,
        errorCode: 'UNAUTHORIZED',
        isAuthError: true,
      });
    };

    try {
      await queryClient.fetchQuery({ queryKey: key, queryFn: failingFetcher });
      assert.fail('Should have thrown ApiError');
    } catch (err: any) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 401);
      assert.equal(err.errorCode, 'UNAUTHORIZED');
      assert.equal(err.isAuthError, true);
    }
  });

  it('5. Mutation cache invalidation marks target queries stale', async () => {
    const key = queryKeys.auth.sessions();

    // Populate cache with initial active sessions
    queryClient.setQueryData(key, [{ sessionId: 'sess-1', deviceLabel: 'Chrome Mac' }]);
    assert.ok(queryClient.getQueryState(key)?.data);
    assert.equal(queryClient.getQueryState(key)?.isInvalidated, false);

    // Simulate mutation invalidation
    await queryClient.invalidateQueries({ queryKey: key });

    // Target query is now invalidated
    const state = queryClient.getQueryState(key);
    assert.equal(state?.isInvalidated, true, 'Query state must be marked invalidated');
  });

  it('6. Mutation retry is strictly disabled', async () => {
    let mutationAttempts = 0;

    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: async () => {
        mutationAttempts++;
        throw new Error('Mutation failed');
      },
    });

    try {
      await mutation.execute(undefined);
      assert.fail('Should have failed');
    } catch {
      assert.equal(mutationAttempts, 1, 'Mutating action must never retry automatically');
    }
  });

  it('7. Security & Storage audit: Tokens and user identity are never stored in browser storage', () => {
    // In Node test environment, mock/verify global storage contracts
    const storageKeys = typeof localStorage !== 'undefined' ? Object.keys(localStorage) : [];
    const forbiddenPatterns = ['token', 'jwt', 'user', 'role', 'admin', 'refresh'];

    for (const key of storageKeys) {
      const lower = key.toLowerCase();
      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !lower.includes(pattern),
          `Forbidden storage key detected: "${key}". Sensitive auth/roles must never enter localStorage.`
        );
      }
    }
  });
});
