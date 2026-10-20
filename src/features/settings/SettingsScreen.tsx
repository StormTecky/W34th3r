import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { getConfig } from '@/config/env';
import { ScreenHeader } from '@/ui/ScreenHeader';

import { SegmentedControl, type SegmentOption } from './SegmentedControl';
import { usePreferences } from './use-preferences';
import type { Appearance, PrecipitationUnit, TemperatureUnit, WindSpeedUnit } from '@/domain/types';

const TEMPERATURE: SegmentOption<TemperatureUnit>[] = [
  { value: 'c', label: '°C', accessibilityLabel: 'Celsius' },
  { value: 'f', label: '°F', accessibilityLabel: 'Fahrenheit' },
];

const WIND: SegmentOption<WindSpeedUnit>[] = [
  { value: 'ms', label: 'm/s', accessibilityLabel: 'Metres per second' },
  { value: 'kmh', label: 'km/h', accessibilityLabel: 'Kilometres per hour' },
  { value: 'mph', label: 'mph', accessibilityLabel: 'Miles per hour' },
  { value: 'kn', label: 'kn', accessibilityLabel: 'Knots' },
];

const PRECIPITATION: SegmentOption<PrecipitationUnit>[] = [
  { value: 'mm', label: 'mm', accessibilityLabel: 'Millimetres' },
  { value: 'in', label: 'in', accessibilityLabel: 'Inches' },
];

const APPEARANCE: SegmentOption<Appearance>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[typography.headline, { color: colors.text }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

interface ChoiceProps<T extends string> {
  title: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}

function Choice<T extends string>({ title, value, options, onChange }: ChoiceProps<T>) {
  return (
    <Section title={title}>
      <SegmentedControl label={title} value={value} options={options} onChange={onChange} />
    </Section>
  );
}

function Choices() {
  const { preferences: p, update } = usePreferences();
  return (
    <>
      <Choice
        title="Temperature"
        value={p.temperatureUnit}
        options={TEMPERATURE}
        onChange={(temperatureUnit) => void update({ temperatureUnit })}
      />
      <Choice
        title="Wind speed"
        value={p.windSpeedUnit}
        options={WIND}
        onChange={(windSpeedUnit) => void update({ windSpeedUnit })}
      />
      <Choice
        title="Precipitation"
        value={p.precipitationUnit}
        options={PRECIPITATION}
        onChange={(precipitationUnit) => void update({ precipitationUnit })}
      />
      <Choice
        title="Appearance"
        value={p.appearance}
        options={APPEARANCE}
        onChange={(appearance) => void update({ appearance })}
      />
    </>
  );
}

const ATTRIBUTION: Record<string, string> = {
  'open-meteo':
    'Weather data by Open-Meteo.com (CC BY 4.0). The name of your location comes from BigDataCloud.',
  openweather: 'Weather data by OpenWeather.',
};

/** Credit for the weather provider in use, as its terms require. Nothing for the fake provider. */
function Attribution() {
  const { colors } = useTheme();
  const text = ATTRIBUTION[getConfig().provider];
  if (!text) return null;
  return (
    <Text testID="attribution" style={[typography.caption, { color: colors.textSecondary }]}>
      {text}
    </Text>
  );
}

/** Units and appearance. Changes apply everywhere immediately and are remembered. */
export function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top, paddingBottom: insets.bottom };

  return (
    <View
      testID="settings-screen"
      style={[styles.screen, { backgroundColor: colors.background }, padding]}
    >
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <Choices />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Units start from your region and change only when you choose.
        </Text>
        <Attribution />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: spacing.lg },
  content: { gap: spacing.xl, paddingVertical: spacing.lg },
  section: { gap: spacing.md },
});
