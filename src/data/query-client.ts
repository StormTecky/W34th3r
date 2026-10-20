import { QueryClient, type Query } from '@tanstack/react-query';
import Constants from 'expo-constants';

import { getConfig } from '@/config/env';
import { STALE_AFTER_SECONDS } from '@/domain/freshness';

import { createStoragePersister } from './persister';

export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Bump when the shape of a cached WeatherSnapshot changes. */
export const CACHE_SCHEMA_VERSION = 1;

export const weatherQueryKey = (placeId: string) => ['weather', placeId] as const;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_AFTER_SECONDS * 1000,
        gcTime: CACHE_MAX_AGE_MS,
        // The OpenWeather client already retries once; stacking more retries would hide failures.
        retry: false,
        // No connectivity library is wired in; let the fetch itself report being offline.
        networkMode: 'always',
        refetchOnWindowFocus: true,
      },
    },
  });
}

export function makeCacheBuster(appVersion: string, schemaVersion: number): string {
  return `${appVersion}:${schemaVersion}`;
}

/** The app version plus the weather provider, so switching provider never shows the old one's data. */
function defaultCacheVersion(): string {
  let provider = 'unknown';
  try {
    provider = getConfig().provider;
  } catch {
    // A configuration error is reported on screen elsewhere; the cache just needs a stable key.
  }
  return `${Constants.expoConfig?.version ?? '0'}+${provider}`;
}

export function createPersistOptions(appVersion: string = defaultCacheVersion()) {
  return {
    persister: createStoragePersister(),
    maxAge: CACHE_MAX_AGE_MS,
    buster: makeCacheBuster(appVersion, CACHE_SCHEMA_VERSION),
    dehydrateOptions: {
      shouldDehydrateQuery: (query: Query) =>
        query.queryKey[0] === 'weather' && query.state.status === 'success',
    },
  };
}
