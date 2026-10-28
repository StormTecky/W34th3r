import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { getTheme, type WeatherTheme } from '@/theme/theme-engine';
import { spacing, typography } from '@/theme/tokens';
import { BounceText } from '@/ui/BounceText';
import { ErrorState } from '@/ui/ErrorState';
import type { IconName } from '@/ui/Icon';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { Skeleton } from '@/ui/Skeleton';

import { AlertsSection } from './AlertsSection';
import { buildDetails, type DetailsModel } from './details-view-model';
import { DetailTile } from './DetailTile';
import { SunArc } from './SunArc';
import { UVMeter } from './UVMeter';
import { WindCompass } from './WindCompass';

interface ValueTileProps {
  title: string;
  icon: IconName;
  label: string;
  order: number;
  theme: WeatherTheme;
}

/** A tile that shows one number, which bounces when it changes. */
function ValueTile({ title, icon, label, order, theme }: ValueTileProps) {
  return (
    <DetailTile title={title} icon={icon} theme={theme} order={order}>
      <BounceText testID="detail-value" style={[typography.numeral, { color: theme.tile.text }]}>
        {label}
      </BounceText>
    </DetailTile>
  );
}

/** Humidity, visibility and pressure: one number per tile. */
function ValueTiles({ model, theme }: { model: DetailsModel; theme: WeatherTheme }) {
  const { titles } = useLocale().messages.details;
  return (
    <>
      <ValueTile
        title={titles.humidity}
        icon="droplet"
        label={model.humidity.label}
        order={2}
        theme={theme}
      />
      <ValueTile
        title={titles.visibility}
        icon="eye"
        label={model.visibility.label}
        order={3}
        theme={theme}
      />
      <ValueTile
        title={titles.pressure}
        icon="gauge"
        label={model.pressure.label}
        order={4}
        theme={theme}
      />
    </>
  );
}

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

  return (
    <>
      <DetailTile title={titles.wind} icon="wind" theme={theme} order={0}>
        <WindCompass wind={model.wind} {...ink} />
      </DetailTile>
      <DetailTile title={titles.uvIndex} icon="sun" theme={theme} order={1}>
        <UVMeter uv={model.uv} {...ink} />
      </DetailTile>
      <ValueTiles model={model} theme={theme} />
      <DetailTile title={titles.sun} icon="sun" theme={theme} order={5} wide>
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
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl },
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
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
