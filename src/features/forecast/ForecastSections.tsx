import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { WeatherSnapshot } from '@/domain/types';
import { usePreferences } from '@/features/settings/use-preferences';
import { useLocale } from '@/lib/use-locale';
import { useNowSeconds } from '@/lib/use-now';
import type { WeatherTheme } from '@/theme/theme-engine';
import { spacing } from '@/theme/tokens';

import { DailyForecast } from './DailyForecast';
import { buildDailyRows, buildHourlyRows } from './forecast-view-model';
import { HourlyForecast } from './HourlyForecast';

export interface ForecastSectionsProps {
  snapshot: WeatherSnapshot;
  theme: WeatherTheme;
}

/** Hourly strip and daily list for a weather snapshot, in the user's units. */
export function ForecastSections({ snapshot, theme }: ForecastSectionsProps) {
  const { preferences } = usePreferences();
  const now = useNowSeconds();
  const { locale } = useLocale();
  const units = preferences.temperatureUnit;

  const hourly = useMemo(
    () => buildHourlyRows(snapshot, { units, now, locale }),
    [snapshot, units, now, locale],
  );
  const daily = useMemo(
    () => buildDailyRows(snapshot, { units, now, locale }),
    [snapshot, units, now, locale],
  );

  return (
    <View style={styles.sections}>
      <HourlyForecast rows={hourly} theme={theme} />
      <DailyForecast rows={daily} theme={theme} />
    </View>
  );
}

const styles = StyleSheet.create({ sections: { gap: spacing.lg, marginTop: spacing.lg } });
