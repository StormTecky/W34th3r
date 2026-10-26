import { render, renderHook } from '@testing-library/react-native';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createAppQueryClient } from '@/data/query-client';
import { DEFAULT_LOCALE } from '@/domain/locale';
import type { UserPreferences } from '@/domain/types';
import { createPlacesStore } from '@/features/places/places-store';
import { PlacesProvider } from '@/features/places/use-places';
import { createPreferencesStore } from '@/features/settings/preferences-store';
import { PreferencesProvider } from '@/features/settings/use-preferences';
import { LocaleProvider } from '@/lib/use-locale';
import { FakeWeatherProvider } from '@/providers/fake/fake-provider';
import type { FakeScenario } from '@/providers/fake/scenarios';
import { WeatherProviderProvider } from '@/providers/provider-context';
import type { WeatherProvider } from '@/providers/weather-provider';

/** 2026-10-20 12:20 UTC: a fixed "now" so fake weather is deterministic. */
export const TEST_NOW = 1_792_498_800;

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export interface RenderWithProvidersOptions {
  scenario?: FakeScenario;
  /** Replace the fake provider entirely (e.g. a jest-instrumented one). */
  provider?: WeatherProvider;
  /** Epoch seconds returned by the fake provider's clock. */
  now?: number;
  /** Initial preferences, applied on top of the region defaults. */
  preferences?: Partial<UserPreferences>;
  /** Device region used for default units; "FR" (metric) unless given. */
  regionCode?: string | null;
  /** Device locale for words and formats, e.g. "fr-FR"; English (US) unless given. */
  locale?: string;
  queryClient?: QueryClient;
  /** Reuse the stores and providers of an earlier render, e.g. to move between screens. */
  environment?: TestEnvironment;
}

/** A query client with the app's defaults, but never leaving garbage-collection timers behind. */
export function createTestQueryClient(): QueryClient {
  const client = createAppQueryClient();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
  });
  return client;
}

/** Builds the providers every screen and hook needs, and returns the pieces tests poke at. */
export async function buildTestEnvironment(options: RenderWithProvidersOptions = {}) {
  const preferencesStore = createPreferencesStore({ regionCode: options.regionCode ?? 'FR' });
  await preferencesStore.hydrate();
  if (options.preferences) await preferencesStore.update(options.preferences);

  const placesStore = createPlacesStore();
  await placesStore.hydrate();

  const fake = new FakeWeatherProvider({
    scenario: options.scenario,
    now: () => options.now ?? TEST_NOW,
  });
  const provider = options.provider ?? fake;
  const queryClient = options.queryClient ?? createTestQueryClient();
  const locale = options.locale ?? DEFAULT_LOCALE;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <QueryClientProvider client={queryClient}>
          <WeatherProviderProvider provider={provider}>
            <PreferencesProvider store={preferencesStore}>
              <PlacesProvider store={placesStore}>
                <LocaleProvider locale={locale}>{children}</LocaleProvider>
              </PlacesProvider>
            </PreferencesProvider>
          </WeatherProviderProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  return { Wrapper, provider, fake, queryClient, preferencesStore, placesStore };
}

export type TestEnvironment = Awaited<ReturnType<typeof buildTestEnvironment>>;

export async function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const env = options.environment ?? (await buildTestEnvironment(options));
  const result = await render(ui, { wrapper: env.Wrapper });
  return { ...result, ...env };
}

export async function renderHookWithProviders<Result, Props = undefined>(
  hook: (props: Props) => Result,
  options: RenderWithProvidersOptions = {},
  initialProps?: Props,
) {
  const env = options.environment ?? (await buildTestEnvironment(options));
  const result = await renderHook(hook, { wrapper: env.Wrapper, initialProps });
  return { ...result, ...env };
}
