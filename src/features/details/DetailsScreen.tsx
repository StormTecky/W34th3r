import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CURRENT_PLACE_ID } from '@/domain/place';
import type { WeatherSnapshot } from '@/domain/types';
import { useWeather, type UseWeatherResult } from '@/features/current/use-weather';
import { LocationPermissionState } from '@/features/places/LocationPermissionState';
import { findPlace } from '@/features/places/find-place';
import { useCurrentPlace } from '@/features/places/use-current-place';
import { useDeviceLocation } from '@/features/places/use-device-location';
import { usePlaces } from '@/features/places/use-places';
import { usePreferences } from '@/features/settings/use-preferences';
import { useLocale } from '@/lib/use-locale';
import { useNowSeconds } from '@/lib/use-now';
import { ConditionBackground } from '@/theme/ConditionBackground';
import { sidePadding } from '@/theme/layout';
import { getTheme, type WeatherTheme } from '@/theme/theme-engine';
import { layout, spacing, typography } from '@/theme/tokens';
import { ErrorState } from '@/ui/ErrorState';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Skeleton } from '@/ui/Skeleton';

import { AlertsSection } from './AlertsSection';
import { buildDetails } from './details-view-model';
import { DetailTile } from './DetailTile';
import { SunArc } from './SunArc';
import { UVMeter } from './UVMeter';
import { WindCompass } from './WindCompass';

function Measurements({ snapshot, theme }: { snapshot: WeatherSnapshot; theme: WeatherTheme }) {
  const { preferences } = usePreferences();
  const now = useNowSeconds();
  const { locale, messages } = useLocale();
  const { titles } = messages.details;
  const model = useMemo(
    () => buildDetails(snapshot, { windSpeedUnit: preferences.windSpeedUnit, now, locale }),
    [snapshot, preferences.windSpeedUnit, now, locale],
  );
  const { tile } = theme;
  const ink = { color: tile.text, secondaryColor: tile.textSecondary, accentColor: tile.accent };
  const value = [typography.numeral, { color: tile.text }];

  return (
    <>
      <DetailTile title={titles.wind} icon="wind" theme={theme}>
        <WindCompass wind={model.wind} {...ink} />
      </DetailTile>
      <DetailTile title={titles.uvIndex} icon="sun" theme={theme}>
        <UVMeter uv={model.uv} {...ink} />
      </DetailTile>
      <DetailTile title={titles.humidity} icon="droplet" theme={theme}>
        <Text style={value}>{model.humidity.label}</Text>
      </DetailTile>
      <DetailTile title={titles.visibility} icon="eye" theme={theme}>
        <Text style={value}>{model.visibility.label}</Text>
      </DetailTile>
      <DetailTile title={titles.pressure} icon="gauge" theme={theme}>
        <Text style={value}>{model.pressure.label}</Text>
      </DetailTile>
      <DetailTile title={titles.sun} icon="sun" theme={theme} wide>
        <SunArc sun={model.sun} {...ink} />
      </DetailTile>
    </>
  );
}

interface FrameProps {
  title: string;
  weather: UseWeatherResult;
  children: (theme: WeatherTheme) => ReactNode;
}

/** The weather sky behind a back button, the place name, and a scrolling grid of tiles. */
function DetailsFrame({ title, weather, children }: FrameProps) {
  const insets = useSafeAreaInsets();
  const current = weather.data?.current;
  const theme = current ? getTheme(current.condition, current.isDay) : getTheme('unknown', true);

  return (
    <ConditionBackground condition={current?.condition ?? 'unknown'} isDay={current?.isDay ?? true}>
      <StatusBar style={theme.statusBar} />
      <ScrollView
        testID="details-scroll"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom + spacing.xl,
            ...sidePadding(insets, spacing.lg),
          },
        ]}
      >
        <ScreenHeader title={title} color={theme.text} />
        {children(theme)}
      </ScrollView>
    </ConditionBackground>
  );
}

function DetailsBody({ weather, theme }: { weather: UseWeatherResult; theme: WeatherTheme }) {
  if (weather.data) {
    return (
      <>
        <AlertsSection snapshot={weather.data} />
        <View style={styles.grid}>
          <Measurements snapshot={weather.data} theme={theme} />
        </View>
      </>
    );
  }
  if (weather.errorKind) return <ErrorState kind={weather.errorKind} onRetry={weather.refetch} />;
  return <Skeleton height={160} radius={24} />;
}

function CurrentLocationDetails() {
  const location = useDeviceLocation();
  const place = useCurrentPlace(location.coords);
  const weather = useWeather(place);

  return (
    <DetailsFrame title={place?.name ?? ''} weather={weather}>
      {(theme) =>
        location.status === 'granted' || location.status === 'checking' ? (
          <DetailsBody weather={weather} theme={theme} />
        ) : (
          <LocationPermissionState
            variant={location.status === 'unavailable' ? 'unavailable' : 'denied'}
            theme={theme}
            onRetry={location.refresh}
          />
        )
      }
    </DetailsFrame>
  );
}

function PlaceDetails({ placeId }: { placeId: string }) {
  const { places, viewed } = usePlaces();
  const place = findPlace(placeId, places, viewed);
  const weather = useWeather(place);

  if (!place) {
    return (
      <DetailsFrame title="" weather={weather}>
        {() => <ErrorState kind="not-found" />}
      </DetailsFrame>
    );
  }
  return (
    <DetailsFrame title={place.name} weather={weather}>
      {(theme) => <DetailsBody weather={weather} theme={theme} />}
    </DetailsFrame>
  );
}

/** Wind, UV, humidity, visibility, pressure, sun times and alerts for one place. */
export function DetailsScreen() {
  const { placeId } = useLocalSearchParams<{ placeId?: string }>();
  const id = placeId ?? CURRENT_PLACE_ID;
  return id === CURRENT_PLACE_ID ? <CurrentLocationDetails /> : <PlaceDetails placeId={id} />;
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
