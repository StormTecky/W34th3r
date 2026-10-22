import { StyleSheet, Text, View } from 'react-native';

import { useLocale } from '@/lib/use-locale';
import type { WeatherTheme } from '@/theme/theme-engine';
import { spacing, typography } from '@/theme/tokens';
import { temperatureColor } from '@/theme/temperature-color';
import { ConditionIcon } from '@/ui/ConditionIcon';
import { RangeBar } from '@/ui/RangeBar';

import { ForecastCard } from './ForecastCard';
import type { DailyRow } from './forecast-view-model';

export interface DailyForecastProps {
  rows: DailyRow[];
  theme: WeatherTheme;
}

function DayRange({ row, theme }: { row: DailyRow; theme: WeatherTheme }) {
  const { tile } = theme;
  return (
    <>
      <Text style={[typography.body, styles.low, { color: tile.textSecondary }]}>
        {row.lowLabel}
      </Text>
      <RangeBar
        start={row.rangeStart}
        end={row.rangeEnd}
        trackColor={`${tile.text}22`}
        fillColor={tile.accent}
        gradient={[temperatureColor(row.lowC), temperatureColor(row.highC)]}
      />
      <Text style={[typography.bodyStrong, styles.high, { color: tile.text }]}>
        {row.highLabel}
      </Text>
    </>
  );
}

function DailyRowView({
  row,
  first,
  theme,
}: {
  row: DailyRow;
  first: boolean;
  theme: WeatherTheme;
}) {
  const { tile } = theme;
  const divider = first
    ? null
    : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${tile.text}22` };
  return (
    <View
      testID="daily-row"
      accessible
      accessibilityLabel={row.a11yLabel}
      style={[styles.row, divider]}
    >
      <Text style={[typography.bodyStrong, styles.day, { color: tile.text }]}>{row.dayLabel}</Text>
      <ConditionIcon condition={row.condition} isDay color={tile.accent} size={26} />
      <Text style={[typography.caption, styles.precip, { color: tile.textSecondary }]}>
        {row.precipLabel ?? ''}
      </Text>
      <DayRange row={row} theme={theme} />
    </View>
  );
}

/** The next 7 days: day, condition, chance of precipitation, and the temperature range. */
export function DailyForecast({ rows, theme }: DailyForecastProps) {
  const { messages } = useLocale();
  if (rows.length === 0) return null;
  return (
    <ForecastCard title={messages.forecast.dailyTitle} icon="calendar" theme={theme}>
      {rows.map((row, index) => (
        <DailyRowView key={row.key} row={row} first={index === 0} theme={theme} />
      ))}
    </ForecastCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  day: { width: 92 },
  precip: { width: 36, textAlign: 'right' },
  low: { width: 38, textAlign: 'right' },
  high: { width: 38 },
});
