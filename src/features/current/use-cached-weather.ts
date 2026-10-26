import { skipToken, useQuery } from '@tanstack/react-query';

import { weatherQueryKey } from '@/data/query-client';
import type { WeatherSnapshot } from '@/domain/types';
import { useLocale } from '@/lib/use-locale';

/** Reads a place's cached weather without ever triggering a fetch (e.g. for list rows). */
export function useCachedWeather(placeId: string): WeatherSnapshot | undefined {
  const { language } = useLocale();
  return useQuery<WeatherSnapshot>({
    queryKey: weatherQueryKey(placeId, language),
    queryFn: skipToken,
  }).data;
}
