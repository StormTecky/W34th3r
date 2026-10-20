import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { focusManager } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState, Appearance, StyleSheet, Text, View, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { createAppQueryClient, createPersistOptions } from '@/data/query-client';
import { getAppPlacesStore, PlacesProvider, usePlaces } from '@/features/places/use-places';
import {
  getAppPreferencesStore,
  PreferencesProvider,
  usePreferences,
} from '@/features/settings/use-preferences';
import { log } from '@/lib/logger';
import { createDefaultProvider, WeatherProviderProvider } from '@/providers/provider-context';
import type { WeatherProvider } from '@/providers/weather-provider';
import { spacing, typography } from '@/theme/tokens';
import { useAppFonts } from '@/theme/use-app-fonts';
import { useTheme } from '@/theme/use-theme';

type ProviderResult = { provider: WeatherProvider } | { configError: string };

/** Builds the provider once; a missing API key becomes a readable screen instead of a crash. */
function createProvider(): ProviderResult {
  try {
    return { provider: createDefaultProvider() };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid configuration';
    log.error('Invalid configuration', { reason: message });
    return { configError: message };
  }
}

/** Lets TanStack Query know when the app returns to the foreground, so stale data refetches. */
function useForegroundRefetch(): void {
  useEffect(() => {
    const onChange = (status: AppStateStatus) => focusManager.setFocused(status === 'active');
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);
}

function ThemedStack() {
  const { preferences } = usePreferences();
  const { scheme, colors } = useTheme();

  // Apply the chosen appearance to the whole app, including native chrome.
  useEffect(() => {
    // Not available on react-native-web, which is only used for local design previews.
    Appearance.setColorScheme?.(
      preferences.appearance === 'system' ? 'unspecified' : preferences.appearance,
    );
  }, [preferences.appearance]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      />
    </>
  );
}

function ConfigError({ message }: { message: string }) {
  return (
    <View style={styles.config}>
      <Text style={typography.headline}>W34th3r is not configured</Text>
      <Text style={typography.body}>{message}</Text>
    </View>
  );
}

export default function RootLayout() {
  const fontsReady = useAppFonts();
  const queryClient = useMemo(() => createAppQueryClient(), []);
  const persistOptions = useMemo(() => createPersistOptions(), []);
  const providerResult = useMemo(() => createProvider(), []);
  const preferencesStore = getAppPreferencesStore();
  const storesReady = useStoresReady();
  useForegroundRefetch();

  if (!fontsReady || !storesReady) return null;
  if ('configError' in providerResult) return <ConfigError message={providerResult.configError} />;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <WeatherProviderProvider provider={providerResult.provider}>
            <PreferencesProvider store={preferencesStore}>
              <PlacesProvider store={getAppPlacesStore()}>
                <ThemedStack />
              </PlacesProvider>
            </PreferencesProvider>
          </WeatherProviderProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Starts loading stored preferences and places once, and reports when both are available. */
function useStoresReady(): boolean {
  const preferences = usePreferences();
  const places = usePlaces();
  useEffect(() => {
    void getAppPreferencesStore().hydrate();
    void getAppPlacesStore().hydrate();
  }, []);
  return preferences.ready && places.ready;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  config: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
});
