import type { Query } from '@tanstack/react-query';

import {
  CACHE_MAX_AGE_MS,
  createAppQueryClient,
  createPersistOptions,
  makeCacheBuster,
  weatherQueryKey,
} from '@/data/query-client';
import { STALE_AFTER_SECONDS } from '@/domain/freshness';

describe('query client defaults', () => {
  const defaults = createAppQueryClient().getDefaultOptions().queries!;

  it('treats data as stale after 15 minutes', () => {
    expect(defaults.staleTime).toBe(STALE_AFTER_SECONDS * 1000);
    expect(defaults.staleTime).toBe(15 * 60 * 1000);
  });

  it('keeps cached data for 7 days so it survives restarts', () => {
    expect(defaults.gcTime).toBe(7 * 24 * 60 * 60 * 1000);
    expect(CACHE_MAX_AGE_MS).toBe(defaults.gcTime);
  });

  it('does not add its own retries (the OpenWeather client owns the retry policy)', () => {
    expect(defaults.retry).toBe(false);
  });

  it('does not pause fetches based on a connectivity flag it cannot observe', () => {
    expect(defaults.networkMode).toBe('always');
  });

  it('refetches stale data when the app returns to the foreground', () => {
    expect(defaults.refetchOnWindowFocus).toBe(true);
  });
});

describe('weatherQueryKey', () => {
  it('is keyed per place', () => {
    expect(weatherQueryKey('current')).toEqual(['weather', 'current']);
    expect(weatherQueryKey('48.86,2.35')).toEqual(['weather', '48.86,2.35']);
  });
});

describe('persistence options', () => {
  it('drops the persisted cache when the app version or schema version changes', () => {
    expect(makeCacheBuster('1.0.0', 1)).toBe(makeCacheBuster('1.0.0', 1));
    expect(makeCacheBuster('1.0.0', 1)).not.toBe(makeCacheBuster('1.0.1', 1));
    expect(makeCacheBuster('1.0.0', 1)).not.toBe(makeCacheBuster('1.0.0', 2));
  });

  it('includes the weather provider in the default cache key', () => {
    expect(createPersistOptions().buster).toMatch(/\+(open-meteo|openweather|fake|unknown):1$/);
    expect(createPersistOptions('1.0.0+open-meteo').buster).not.toBe(
      createPersistOptions('1.0.0+fake').buster,
    );
  });

  it('expires persisted entries after 7 days', () => {
    expect(createPersistOptions().maxAge).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('persists only successful weather queries', () => {
    const shouldDehydrate = createPersistOptions().dehydrateOptions!.shouldDehydrateQuery!;
    const query = (key: unknown[], status: string) =>
      ({ queryKey: key, state: { status } }) as unknown as Query;
    expect(shouldDehydrate(query(['weather', 'current'], 'success'))).toBe(true);
    expect(shouldDehydrate(query(['weather', 'current'], 'error'))).toBe(false);
    expect(shouldDehydrate(query(['weather', 'current'], 'pending'))).toBe(false);
    expect(shouldDehydrate(query(['search', 'paris'], 'success'))).toBe(false);
  });
});
