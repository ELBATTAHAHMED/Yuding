'use client';

import { useQuery } from '@tanstack/react-query';
import { travelService } from '@/services/travel.service';
import { queryKeys } from '@/lib/query-keys';
import type { Airport } from '@/types/travel.types';

/**
 * Loads the normalized airport directory once with a long stale time (24 hours)
 * to prevent repeated network calls or provider credit waste.
 * Filtering and suggestions are performed locally in the browser.
 */
export function useAirportsQuery() {
  return useQuery<Airport[]>({
    queryKey: queryKeys.travel.airports(),
    queryFn: () => travelService.getAirports(),
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24,
  });
}
