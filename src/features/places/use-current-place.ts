import { useQuery } from '@tanstack/react-query';

import { CURRENT_PLACE_ID } from '@/domain/place';
import type { Place } from '@/domain/types';
import { log } from '@/lib/logger';
import { useWeatherProvider } from '@/providers/provider-context';
import { isProviderError } from '@/providers/weather-provider';

import type { Coordinates } from './use-device-location';

export const GENERIC_PLACE_NAME = 'Current location';

/**
 * The device-location Place. Weather can load as soon as coordinates exist; the name arrives from
 * reverse geocoding a moment later and falls back to a generic label if it is unavailable.
 */
export function useCurrentPlace(coords: Coordinates | null): Place | null {
  const provider = useWeatherProvider();
  const geocoded = useQuery({
    queryKey: ['reverse-geocode', coords?.lat, coords?.lon],
    queryFn: async ({ signal }) => {
      try {
        return await provider.reverseGeocode(coords!.lat, coords!.lon, { signal });
      } catch (error) {
        // The place keeps a generic name; weather still loads. Log the kind, never the coordinates.
        if (isProviderError(error)) log.warn('Reverse geocoding failed', { kind: error.kind });
        throw error;
      }
    },
    enabled: coords !== null,
    staleTime: Infinity,
  });

  if (!coords) return null;
  const named = geocoded.data;
  return {
    id: CURRENT_PLACE_ID,
    name: named?.name ?? GENERIC_PLACE_NAME,
    region: named?.region ?? null,
    country: named?.country ?? '',
    lat: coords.lat,
    lon: coords.lon,
    timeZone: null,
    kind: 'current-location',
    sortOrder: null,
  };
}
