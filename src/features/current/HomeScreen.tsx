import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CURRENT_PLACE_ID } from '@/domain/place';
import type { Place } from '@/domain/types';
import { ForecastSections } from '@/features/forecast/ForecastSections';
import { AlertsSection } from '@/features/details/AlertsSection';
import { findPlace } from '@/features/places/find-place';
import { LocationPermissionState } from '@/features/places/LocationPermissionState';
import { useCurrentPlace } from '@/features/places/use-current-place';
import { useDeviceLocation } from '@/features/places/use-device-location';
import { usePlaces } from '@/features/places/use-places';
import { usePreferences } from '@/features/settings/use-preferences';
import { useLocale } from '@/lib/use-locale';
import { ConditionBackground } from '@/theme/ConditionBackground';
import { getTheme, type WeatherTheme } from '@/theme/theme-engine';
import { spacing, typography } from '@/theme/tokens';
import { describeError } from '@/ui/error-messages';
import { ErrorState } from '@/ui/ErrorState';
import { IconButton } from '@/ui/IconButton';
import { Skeleton } from '@/ui/Skeleton';
import { UpdatedAgoLabel } from '@/ui/UpdatedAgoLabel';

import { CurrentConditionsCard } from './CurrentConditionsCard';
import { useWeather, type UseWeatherResult } from './use-weather';

function LoadingState({ color }: { color: string }) {
  const { messages } = useLocale();
  return (
    <View
      testID="home-loading"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={messages.home.loading}
      style={styles.loading}
    >
      <Skeleton width={160} height={28} color={color} />
      <Skeleton width={220} height={96} radius={24} color={color} />
      <Skeleton width={140} height={22} color={color} />
      <Skeleton width={180} height={18} color={color} />
    </View>
  );
}

/** Error colours that read well on the current sky. */
function skyPalette(theme: WeatherTheme) {
  return {
    text: theme.text,
    textSecondary: theme.textSecondary,
    button: theme.tile.background,
    onButton: theme.tile.text,
  };
}

function NavigationBar({ theme, detailsId }: { theme: WeatherTheme; detailsId: string }) {
  const router = useRouter();
  const { messages } = useLocale();
  return (
    <View style={styles.nav}>
      <IconButton
        icon="list"
        label={messages.home.savedPlaces}
        color={theme.tile.text}
        background={theme.tile.background}
        onPress={() => router.push('/places')}
      />
      <View style={styles.navGroup}>
        <IconButton
          icon="info"
          label={messages.home.weatherDetails}
          color={theme.tile.text}
          background={theme.tile.background}
          onPress={() => router.push(`/details/${detailsId}`)}
        />
        <IconButton
          icon="search"
          label={messages.common.search}
          color={theme.tile.text}
          background={theme.tile.background}
          onPress={() => router.push('/search')}
        />
        <IconButton
          icon="settings"
          label={messages.common.settings}
          color={theme.tile.text}
          background={theme.tile.background}
          onPress={() => router.push('/settings')}
        />
      </View>
    </View>
  );
}

interface FrameProps {
  weather: UseWeatherResult;
  /** Route id of the place whose details the info button opens. */
  detailsId: string;
  onRefresh: () => Promise<void>;
  children: (theme: WeatherTheme) => ReactNode;
}

/** The weather sky, navigation buttons, and a pull-to-refresh scroll area. */
function HomeFrame({ weather, detailsId, onRefresh, children }: FrameProps) {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const current = weather.data?.current;
  const theme = current ? getTheme(current.condition, current.isDay) : getTheme('unknown', true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ConditionBackground condition={current?.condition ?? 'unknown'} isDay={current?.isDay ?? true}>
      <StatusBar style={theme.statusBar} />
      <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.sm }}>
        <NavigationBar theme={theme} detailsId={detailsId} />
      </View>
      <ScrollView
        testID="home-scroll"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.text} />
        }
      >
        {children(theme)}
      </ScrollView>
    </ConditionBackground>
  );
}

interface BodyProps {
  placeName: string;
  weather: UseWeatherResult;
  theme: WeatherTheme;
}

/** Loading, error, or the weather itself for one place. */
function WeatherBody({ placeName, weather, theme }: BodyProps) {
  const { locale } = useLocale();
  const snapshot = weather.data;
  if (!snapshot) {
    if (weather.errorKind) {
      return (
        <ErrorState
          kind={weather.errorKind}
          onRetry={weather.refetch}
          palette={skyPalette(theme)}
        />
      );
    }
    return <LoadingState color={`${theme.text}26`} />;
  }
  return (
    <View>
      <CurrentConditionsCard placeName={placeName} current={snapshot.current} theme={theme} />
      <UpdatedAgoLabel
        fetchedAt={snapshot.fetchedAt}
        always={weather.errorKind !== null}
        color={theme.textSecondary}
      />
      {weather.errorKind ? (
        <Text style={[typography.caption, styles.notice, { color: theme.textSecondary }]}>
          {describeError(weather.errorKind, locale).title}
        </Text>
      ) : null}
      <AlertsSection snapshot={snapshot} />
      <ForecastSections snapshot={snapshot} theme={theme} />
    </View>
  );
}

function CurrentLocationHome() {
  const router = useRouter();
  const location = useDeviceLocation();
  const place = useCurrentPlace(location.coords);
  const weather = useWeather(place);

  const onRefresh = useCallback(async () => {
    await location.refresh();
    await weather.refetch();
  }, [location, weather]);

  const { status } = location;
  const needsLocation =
    status === 'undetermined' || status === 'denied' || status === 'unavailable';

  return (
    <HomeFrame weather={weather} detailsId={CURRENT_PLACE_ID} onRefresh={onRefresh}>
      {(theme) =>
        needsLocation ? (
          <LocationPermissionState
            variant={status}
            theme={theme}
            onAllow={location.requestPermission}
            onRetry={location.refresh}
            onSearch={() => router.push('/search')}
          />
        ) : (
          <WeatherBody placeName={place?.name ?? ''} weather={weather} theme={theme} />
        )
      }
    </HomeFrame>
  );
}

function SelectedPlaceHome({ place }: { place: Place }) {
  const weather = useWeather(place);
  const onRefresh = useCallback(async () => {
    await weather.refetch();
  }, [weather]);

  return (
    <HomeFrame weather={weather} detailsId={place.id} onRefresh={onRefresh}>
      {(theme) => <WeatherBody placeName={place.name} weather={weather} theme={theme} />}
    </HomeFrame>
  );
}

/** Home: weather for the chosen place, or for the device location by default. */
export function HomeScreen() {
  const { preferences } = usePreferences();
  const { places, viewed } = usePlaces();
  const id = preferences.lastViewedPlaceId;

  const selected = findPlace(id, places, viewed);

  return selected ? <SelectedPlaceHome place={selected} /> : <CurrentLocationHome />;
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between' },
  navGroup: { flexDirection: 'row', gap: spacing.sm },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg },
  loading: { alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xxxl },
  notice: { textAlign: 'center', marginTop: spacing.xs },
});
