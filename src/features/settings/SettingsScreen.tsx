import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, typography } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { getConfig } from '@/config/env';
import { EnterView } from '@/ui/EnterView';
import { ScreenHeader } from '@/ui/ScreenHeader';

import { SegmentedControl, type SegmentOption } from './SegmentedControl';
import {
  APPEARANCES,
  PRECIPITATION_UNITS,
  TEMPERATURE_UNITS,
  WIND_SPEED_UNITS,
} from './preferences-store';
import { usePreferences } from './use-preferences';
import type { UnitText } from '@/domain/messages';
import { useLocale } from '@/lib/use-locale';

/** The segments for a set of units, in order, labelled in the interface language. */
function unitOptions<T extends string>(
  order: readonly T[],
  text: Record<T, UnitText>,
): SegmentOption<T>[] {
  return order.map((value) => ({
    value,
    label: text[value].label,
    accessibilityLabel: text[value].name,
  }));
}

function Section({
  title,
  order,
  children,
}: {
  title: string;
  order: number;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <EnterView testID="settings-section" order={order} style={styles.section}>
      <Text accessibilityRole="header" style={[typography.headline, { color: colors.text }]}>
        {title}
      </Text>
      {children}
    </EnterView>
  );
}

interface ChoiceProps<T extends string> {
  title: string;
  /** Position on the screen, so the sections come in one after another. */
  order: number;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}

function Choice<T extends string>({ title, order, value, options, onChange }: ChoiceProps<T>) {
  return (
    <Section title={title} order={order}>
      <SegmentedControl label={title} value={value} options={options} onChange={onChange} />
    </Section>
  );
}

function Choices() {
  const { preferences: p, update } = usePreferences();
  const { messages } = useLocale();
  const { sections, appearance } = messages.settings;
  const { units } = messages;
  const appearanceOptions = APPEARANCES.map((value) => ({ value, label: appearance[value] }));
  return (
    <>
      <Choice
        title={sections.temperature}
        order={0}
        value={p.temperatureUnit}
        options={unitOptions(TEMPERATURE_UNITS, units.temperature)}
        onChange={(temperatureUnit) => void update({ temperatureUnit })}
      />
      <Choice
        title={sections.windSpeed}
        order={1}
        value={p.windSpeedUnit}
        options={unitOptions(WIND_SPEED_UNITS, units.windSpeed)}
        onChange={(windSpeedUnit) => void update({ windSpeedUnit })}
      />
      <Choice
        title={sections.precipitation}
        order={2}
        value={p.precipitationUnit}
        options={unitOptions(PRECIPITATION_UNITS, units.precipitation)}
        onChange={(precipitationUnit) => void update({ precipitationUnit })}
      />
      <Choice
        title={sections.appearance}
        order={3}
        value={p.appearance}
        options={appearanceOptions}
        onChange={(appearance) => void update({ appearance })}
      />
    </>
  );
}

/** Credit for the weather provider in use, as its terms require. Nothing for the fake provider. */
function Attribution() {
  const { colors } = useTheme();
  const { attribution } = useLocale().messages.settings;
  const provider = getConfig().provider;
  const text = provider === 'fake' ? null : attribution[provider];
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
  const { messages } = useLocale();
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top, paddingBottom: insets.bottom };

  return (
    <View
      testID="settings-screen"
      style={[styles.screen, { backgroundColor: colors.background }, padding]}
    >
      <ScreenHeader title={messages.common.settings} />
      <ScrollView contentContainerStyle={styles.content}>
        <Choices />
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {messages.settings.note}
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
