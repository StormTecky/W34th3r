import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CURRENT_PLACE_ID } from '@/domain/place';
import type { Place } from '@/domain/types';
import { ForecastSections } from '@/features/forecast/ForecastSections';
import { ScrubBar } from '@/features/forecast/ScrubBar';
import type { Moment } from '@/features/forecast/scrub';
import { AlertsSection } from '@/features/details/AlertsSection';
import { findPlace } from '@/features/places/find-place';
import { LocationPermissionState } from '@/features/places/LocationPermissionState';
import { useCurrentPlace } from '@/features/places/use-current-place';
import { useDeviceLocation } from '@/features/places/use-device-location';
import { usePlaces } from '@/features/places/use-places';
import { usePreferences } from '@/features/settings/use-preferences';
import { ConditionBackground } from '@/theme/ConditionBackground';
import { getTheme, type WeatherTheme } from '@/theme/theme-engine';
import { spacing, typography } from '@/theme/tokens';
import { describeError } from '@/ui/error-messages';
import { ErrorState } from '@/ui/ErrorState';
import { IconButton } from '@/ui/IconButton';
import { Skeleton } from '@/ui/Skeleton';
import { UpdatedAgoLabel } from '@/ui/UpdatedAgoLabel';

import { CurrentConditionsCard } from './CurrentConditionsCard';
import { useScrubbing, type Scrubbing } from './use-scrubbing';
import { useWeather, type UseWeatherResult } from './use-weather';

function LoadingState({ color }: { color: string }) {
  return (
    <View
      testID="home-loading"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading weather"
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
  return (
    <View style={styles.nav}>
      <IconButton
        icon="list"
        label="Saved places"
        color={theme.tile.text}
        background={theme.tile.background}
        onPress={() => router.push('/places')}
      />
      <View style={styles.navGroup}>
        <IconButton
          icon="info"
          label="Weather details"
          color={theme.tile.text}
          background={theme.tile.background}
          onPress={() => router.push(`/details/${detailsId}`)}
        />
        <IconButton
          icon="search"
          label="Search"
          color={theme.tile.text}
          background={theme.tile.background}
          onPress={() => router.push('/search')}
        />
        <IconButton
          icon="settings"
          label="Settings"
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
  /** A moment chosen on the time-travel bar; its sky replaces the live one while set. */
  moment?: Moment | null;
  /** The time-travel bar, pinned to the bottom of the screen. */
  scrubber?: (theme: WeatherTheme) => ReactNode;
  children: (theme: WeatherTheme) => ReactNode;
}

/** Room left at the bottom of the scroll area so the pinned bar never covers content. */
const SCRUBBER_SPACE = 120;

/** Runs a refresh and reports whether it is in progress, for the pull-to-refresh spinner. */
function useRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);
  return { refreshing, refresh };
}

/** The weather sky, navigation buttons, and a pull-to-refresh scroll area. */
function HomeFrame({ weather, detailsId, onRefresh, moment, scrubber, children }: FrameProps) {
  const insets = useSafeAreaInsets();
  const { refreshing, refresh } = useRefresh(onRefresh);
  const shown = moment ?? weather.data?.current;
  const theme = shown ? getTheme(shown.condition, shown.isDay) : getTheme('unknown', true);

  return (
    <ConditionBackground condition={shown?.condition ?? 'unknown'} isDay={shown?.isDay ?? true}>
      <StatusBar style={theme.statusBar} />
      <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.sm }}>
        <NavigationBar theme={theme} detailsId={detailsId} />
      </View>
      <ScrollView
        testID="home-scroll"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + (scrubber ? SCRUBBER_SPACE : spacing.xl) },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.text} />
        }
      >
        {children(theme)}
      </ScrollView>
      {scrubber ? (
        <View
          pointerEvents="box-none"
          style={[styles.scrubber, { bottom: insets.bottom + spacing.md }]}
        >
          {scrubber(theme)}
        </View>
      ) : null}
    </ConditionBackground>
  );
}

interface BodyProps {
  placeName: string;
  weather: UseWeatherResult;
  theme: WeatherTheme;
  moment?: Moment | null;
}

/** Loading, error, or the weather itself for one place. */
function WeatherBody({ placeName, weather, theme, moment }: BodyProps) {
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
      <CurrentConditionsCard
        placeName={placeName}
        current={snapshot.current}
        theme={theme}
        moment={moment}
      />
      <UpdatedAgoLabel
        fetchedAt={snapshot.fetchedAt}
        always={weather.errorKind !== null}
        color={theme.textSecondary}
      />
      {weather.errorKind ? (
        <Text style={[typography.caption, styles.notice, { color: theme.textSecondary }]}>
          {describeError(weather.errorKind).title}
        </Text>
      ) : null}
      <AlertsSection snapshot={snapshot} />
      <ForecastSections snapshot={snapshot} theme={theme} />
    </View>
  );
}

/** The time-travel bar for a screen's scrubbing state, in the sky's colours. */
function TimeTravel({ scrub, theme }: { scrub: Scrubbing; theme: WeatherTheme }) {
  return <ScrubBar rows={scrub.rows} index={scrub.index} onChange={scrub.setIndex} theme={theme} />;
}

interface CurrentBodyProps {
  location: ReturnType<typeof useDeviceLocation>;
  placeName: string;
  weather: UseWeatherResult;
  scrub: Scrubbing;
  theme: WeatherTheme;
}

/** Either the explanation of what to do about location, or the weather. */
function CurrentBody({ location, placeName, weather, scrub, theme }: CurrentBodyProps) {
  const router = useRouter();
  const { status } = location;
  if (status === 'undetermined' || status === 'denied' || status === 'unavailable') {
    return (
      <LocationPermissionState
        variant={status}
        theme={theme}
        onAllow={location.requestPermission}
        onRetry={location.refresh}
        onSearch={() => router.push('/search')}
      />
    );
  }
  return (
    <WeatherBody placeName={placeName} weather={weather} theme={theme} moment={scrub.moment} />
  );
}

function CurrentLocationHome() {
  const location = useDeviceLocation();
  const place = useCurrentPlace(location.coords);
  const weather = useWeather(place);
  const scrub = useScrubbing(weather.data);

  const onRefresh = useCallback(async () => {
    await location.refresh();
    await weather.refetch();
  }, [location, weather]);

  const { status } = location;
  const needsLocation =
    status === 'undetermined' || status === 'denied' || status === 'unavailable';

  return (
    <HomeFrame
      weather={weather}
      detailsId={CURRENT_PLACE_ID}
      onRefresh={onRefresh}
      moment={needsLocation ? null : scrub.moment}
      scrubber={needsLocation ? undefined : (theme) => <TimeTravel scrub={scrub} theme={theme} />}
    >
      {(theme) => (
        <CurrentBody
          location={location}
          placeName={place?.name ?? ''}
          weather={weather}
          scrub={scrub}
          theme={theme}
        />
      )}
    </HomeFrame>
  );
}

function SelectedPlaceHome({ place }: { place: Place }) {
  const weather = useWeather(place);
  const scrub = useScrubbing(weather.data);
  const onRefresh = useCallback(async () => {
    await weather.refetch();
  }, [weather]);

  return (
    <HomeFrame
      weather={weather}
      detailsId={place.id}
      onRefresh={onRefresh}
      moment={scrub.moment}
      scrubber={(theme) => <TimeTravel scrub={scrub} theme={theme} />}
    >
      {(theme) => (
        <WeatherBody placeName={place.name} weather={weather} theme={theme} moment={scrub.moment} />
      )}
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
  scrubber: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg },
  loading: { alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xxxl },
  notice: { textAlign: 'center', marginTop: spacing.xs },
});
