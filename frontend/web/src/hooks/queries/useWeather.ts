'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { weatherService } from '@/services/weather.service';
import type { WeatherParams, WeatherResponse } from '@/types/weather.types';

/** Loads destination weather only after valid GeoPlace coordinates are available. */
export function useWeather(params: WeatherParams | null | undefined) {
  const enabled = Boolean(
    params && Number.isFinite(params.lat) && Number.isFinite(params.lon)
  );

  return useQuery<WeatherResponse>({
    queryKey: enabled
      ? queryKeys.travel.weather(params!.lat, params!.lon, params!.forecastDays)
      : [...queryKeys.travel.all, 'weather', 'disabled'],
    queryFn: () => weatherService.getWeather(params!),
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 1,
  });
}
