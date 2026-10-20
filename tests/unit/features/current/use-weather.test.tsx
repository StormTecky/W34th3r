import { act, waitFor } from '@testing-library/react-native';
import { focusManager } from '@tanstack/react-query';

import { weatherQueryKey } from '@/data/query-client';
import type { WeatherSnapshot } from '@/domain/types';
import { useWeather } from '@/features/current/use-weather';
import { buildSnapshot } from '@/providers/fake/scenarios';
import { ProviderError, type WeatherProvider } from '@/providers/weather-provider';

import {
  createTestQueryClient,
  renderHookWithProviders,
  type RenderWithProvidersOptions,
} from '../../../helpers/render';

const nowSeconds = () => Math.floor(Date.now() / 1000);
const paris = { id: '48.86,2.35', lat: 48.86, lon: 2.35 };
const tokyo = { id: '35.68,139.69', lat: 35.68, lon: 139.69 };

const MINUTE = 60;

function snapshotFetchedAgo(ageSeconds: number, placeId = paris.id): WeatherSnapshot {
  const at = nowSeconds() - ageSeconds;
  return {
    ...buildSnapshot('clear-day', { placeId, timeZone: 'Europe/Paris', now: at }),
    fetchedAt: at,
  };
}

async function setup(options: RenderWithProvidersOptions & { place?: typeof paris | null } = {}) {
  const { place = paris, ...rest } = options;
  return renderHookWithProviders(() => useWeather(place), { now: nowSeconds(), ...rest });
}

/** Seeds the cache before mounting, mirroring data restored from a previous session. */
async function setupWithCache(cachedAgo: number, options: RenderWithProvidersOptions = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(weatherQueryKey(paris.id), snapshotFetchedAgo(cachedAgo), {
    updatedAt: Date.now() - cachedAgo * 1000,
  });
  return renderHookWithProviders(() => useWeather(paris), {
    now: nowSeconds(),
    queryClient,
    ...options,
  });
}

beforeEach(() => {
  jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  jest.spyOn(console, 'info').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('loading', () => {
  it('starts loading and then exposes fresh data', async () => {
    const { result, fake } = await setup();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorKind).toBeNull();
    expect(result.current.freshness).toBe('fresh');
    expect(fake.calls.getWeather).toBe(1);
  });

  it('does nothing without a place', async () => {
    const { result, fake } = await setup({ place: null });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(fake.calls.getWeather).toBe(0);
  });

  it('keeps separate cache entries per place', async () => {
    const { queryClient, fake } = await setup();
    await waitFor(() => expect(queryClient.getQueryData(weatherQueryKey(paris.id))).toBeDefined());
    const second = await renderHookWithProviders(() => useWeather(tokyo), {
      queryClient,
      now: nowSeconds(),
    });
    await waitFor(() => expect(second.result.current.data?.placeId).toBe(tokyo.id));
    expect(queryClient.getQueryData<WeatherSnapshot>(weatherQueryKey(paris.id))?.placeId).toBe(
      paris.id,
    );
    expect(fake.calls.getWeather).toBe(1);
  });
});

describe('the 15 minute refresh rule', () => {
  it('does not refetch data that is 5 minutes old', async () => {
    const { result, fake } = await setupWithCache(5 * MINUTE);
    expect(result.current.data).toBeDefined();
    expect(result.current.freshness).toBe('fresh');
    await act(async () => undefined);
    expect(fake.calls.getWeather).toBe(0);
  });

  it('shows 16 minute old data immediately and refetches it', async () => {
    const { result, fake } = await setupWithCache(16 * MINUTE);
    const oldFetchedAt = result.current.data!.fetchedAt;
    expect(result.current.freshness).toBe('stale');
    await waitFor(() => expect(result.current.data!.fetchedAt).toBeGreaterThan(oldFetchedAt));
    expect(fake.calls.getWeather).toBe(1);
    expect(result.current.freshness).toBe('fresh');
  });

  it('refetches stale data when the app returns to the foreground', async () => {
    const { result, queryClient, fake } = await setupWithCache(5 * MINUTE);
    expect(fake.calls.getWeather).toBe(0);
    // Time passes while the app is in the background: the cached entry is now 16 minutes old.
    queryClient.setQueryData(weatherQueryKey(paris.id), snapshotFetchedAgo(16 * MINUTE), {
      updatedAt: Date.now() - 16 * MINUTE * 1000,
    });
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    await waitFor(() => expect(fake.calls.getWeather).toBe(1));
    await waitFor(() => expect(result.current.freshness).toBe('fresh'));
  });

  it('refetches on demand even when the data is fresh', async () => {
    const { result, fake } = await setupWithCache(1 * MINUTE);
    expect(fake.calls.getWeather).toBe(0);
    await act(async () => result.current.refetch());
    expect(fake.calls.getWeather).toBe(1);
  });

  it('reports refreshing while a refetch is in flight', async () => {
    const { result } = await setupWithCache(20 * MINUTE);
    expect(result.current.isRefreshing).toBe(true);
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
  });
});

describe('failures', () => {
  it('keeps the previous data and reports the error when a refetch fails', async () => {
    const { result } = await setupWithCache(20 * MINUTE, { scenario: 'offline' });
    const cachedAt = result.current.data!.fetchedAt;
    await waitFor(() => expect(result.current.errorKind).toBe('offline'));
    expect(result.current.data).toBeDefined();
    expect(result.current.data!.fetchedAt).toBe(cachedAt);
    expect(result.current.freshness).toBe('stale');
    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces the ProviderError kind when there is no cached data', async () => {
    const { result } = await setup({ scenario: 'timeout' });
    await waitFor(() => expect(result.current.errorKind).toBe('timeout'));
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('recovers when a later retry succeeds', async () => {
    const { result, fake } = await setup({ scenario: 'server-error' });
    await waitFor(() => expect(result.current.errorKind).toBe('server-error'));
    fake.setScenario('clear-day');
    await act(async () => result.current.refetch());
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.errorKind).toBeNull();
  });

  it('maps unexpected errors to server-error so the UI always has a kind', async () => {
    const provider: WeatherProvider = {
      getWeather: jest.fn().mockRejectedValue(new TypeError('x is not a function')),
      searchPlaces: jest.fn(),
      reverseGeocode: jest.fn(),
    };
    const { result } = await setup({ provider });
    await waitFor(() => expect(result.current.errorKind).toBe('server-error'));
  });

  it('keeps ProviderError kinds exactly as thrown', async () => {
    const provider: WeatherProvider = {
      getWeather: jest.fn().mockRejectedValue(new ProviderError('rate-limited')),
      searchPlaces: jest.fn(),
      reverseGeocode: jest.fn(),
    };
    const { result } = await setup({ provider });
    await waitFor(() => expect(result.current.errorKind).toBe('rate-limited'));
  });
});
