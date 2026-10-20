import { skipToken, useQuery } from '@tanstack/react-query';

import { weatherQueryKey } from '@/data/query-client';
import type { WeatherSnapshot } from '@/domain/types';

/** Reads a place's cached weather without ever triggering a fetch (e.g. for list rows). */
export function useCachedWeather(placeId: string): WeatherSnapshot | undefined {
  return useQuery<WeatherSnapshot>({
    queryKey: weatherQueryKey(placeId),
    queryFn: skipToken,
  }).data;
}
