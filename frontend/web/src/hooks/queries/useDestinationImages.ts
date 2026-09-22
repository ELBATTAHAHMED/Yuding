'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { imageService } from '@/services/image.service';
import type { DestinationImageRequest, DestinationImagesResponse } from '@/types/image.types';

/**
 * Loads contextual destination imagery from Pexels via Gateway.
 * Only triggers when a valid structured destination is present.
 */
export function useDestinationImages(request: DestinationImageRequest | null | undefined) {
  const city = request?.city?.trim() || '';
  const country = request?.country?.trim() || '';
  const limit = request?.limit ?? 3;

  const enabled = Boolean(city.length >= 2);

  return useQuery<DestinationImagesResponse>({
    queryKey: enabled
      ? queryKeys.travel.destinationImages(city, country, limit)
      : [...queryKeys.travel.all, 'destination-images', 'disabled'],
    queryFn: () => imageService.getDestinationImages({ ...request!, city, country, limit }),
    enabled,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
}
