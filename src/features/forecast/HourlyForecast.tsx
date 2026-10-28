import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLocale } from '@/lib/use-locale';
import type { WeatherTheme } from '@/theme/theme-engine';
import { spacing, typography } from '@/theme/tokens';
import { ConditionIcon } from '@/ui/ConditionIcon';

import { ForecastCard } from './ForecastCard';
import type { HourlyRow } from './forecast-view-model';

export interface HourlyForecastProps {
  rows: HourlyRow[];
  theme: WeatherTheme;
}

/** The next 24 hours as a horizontally scrolling strip. */
export function HourlyForecast({ rows, theme }: HourlyForecastProps) {
  const { messages } = useLocale();
  if (rows.length === 0) return null;
  return (
    <ForecastCard title={messages.forecast.hourlyTitle} icon="clock" theme={theme} order={1}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {rows.map((row) => (
          <View
            key={row.key}
            testID="hourly-row"
            accessible
            accessibilityLabel={row.a11yLabel}
            style={styles.column}
          >
            <Text style={[typography.caption, { color: theme.tile.textSecondary }]}>
              {row.timeLabel}
            </Text>
            <ConditionIcon condition={row.condition} isDay={row.isDay} color={theme.tile.accent} />
            <Text style={[typography.bodyStrong, { color: theme.tile.text }]}>
              {row.temperatureLabel}
            </Text>
            <Text style={[typography.caption, styles.precip, { color: theme.tile.textSecondary }]}>
              {row.precipLabel ?? ' '}
            </Text>
          </View>
        ))}
      </ScrollView>
    </ForecastCard>
  );
}

const styles = StyleSheet.create({
  strip: { gap: spacing.md },
  column: { alignItems: 'center', gap: spacing.xs, minWidth: 52 },
  precip: { minHeight: 18 },
});
