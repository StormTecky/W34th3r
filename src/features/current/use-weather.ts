import { useQuery } from '@tanstack/react-query';

import { weatherQueryKey } from '@/data/query-client';
import { freshnessOf, type Freshness } from '@/domain/freshness';
import type { WeatherSnapshot } from '@/domain/types';
import { log } from '@/lib/logger';
import { useNowSeconds } from '@/lib/use-now';
import { useWeatherProvider } from '@/providers/provider-context';
import {
  isProviderError,
  type ProviderErrorKind,
  type WeatherTarget,
} from '@/providers/weather-provider';

export interface UseWeatherResult {
  /** Latest snapshot. Kept (and shown with its age) when a refresh fails. */
  data: WeatherSnapshot | undefined;
  /** Why the last fetch failed, or null. */
  errorKind: ProviderErrorKind | null;
  /** First load with nothing to show yet. */
  isLoading: boolean;
  /** Refetching while older data is on screen. */
  isRefreshing: boolean;
  freshness: Freshness | null;
  refetch: () => Promise<void>;
}

function kindOf(error: unknown): ProviderErrorKind {
  return isProviderError(error) ? error.kind : 'server-error';
}

/**
 * Weather for a place, cached per place id. Data older than 15 minutes is refetched on mount and
 * when the app returns to the foreground; on failure the previous data stays available.
 */
export function useWeather(place: WeatherTarget | null): UseWeatherResult {
  const provider = useWeatherProvider();
  const now = useNowSeconds();

  const query = useQuery({
    queryKey: weatherQueryKey(place?.id ?? 'none'),
    queryFn: async ({ signal }) => {
      try {
        return await provider.getWeather(place!, { signal });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          log.warn('Weather fetch failed', { placeId: place?.id, kind: kindOf(error) });
        }
        throw error;
      }
    },
    enabled: place !== null,
  });

  const data = query.data;
  return {
    data,
    errorKind: query.error ? kindOf(query.error) : null,
    isLoading: query.isPending && query.fetchStatus !== 'idle',
    isRefreshing: query.isFetching && data !== undefined,
    freshness: data ? freshnessOf(data.fetchedAt, now) : null,
    refetch: async () => {
      await query.refetch();
    },
  };
}
