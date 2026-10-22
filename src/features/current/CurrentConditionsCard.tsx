import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Messages } from '@/domain/messages';
import { moodLine } from '@/domain/mood';
import type { CurrentConditions } from '@/domain/types';
import { formatTemperature } from '@/domain/units';
import { usePreferences } from '@/features/settings/use-preferences';
import { useLocale } from '@/lib/use-locale';
import { WeatherScene } from '@/theme/scenes/WeatherScene';
import type { WeatherTheme } from '@/theme/theme-engine';
import { radii, spacing, textShadow, typography } from '@/theme/tokens';
import { useFadeOnChange } from '@/theme/use-fade-on-change';

export interface CurrentConditionsCardProps {
  placeName: string;
  current: CurrentConditions;
  theme: WeatherTheme;
}

const MAX_SCENE_WIDTH = 320;

/** Spoken description of the headline conditions, in the user's units. */
function describe(
  placeName: string,
  current: CurrentConditions,
  units: 'c' | 'f',
  { spoken, current: text }: Messages,
): string {
  const whole = (celsius: number) => formatTemperature(celsius, units).replace('°', '');
  return (
    [
      placeName,
      spoken.degrees(whole(current.temperature)),
      current.summary,
      text.spokenFeelsLike(whole(current.feelsLike)),
      text.spokenHighLow(whole(current.high), whole(current.low)),
    ].join('. ') + '.'
  );
}

function Chip({ text, theme }: { text: string; theme: WeatherTheme }) {
  return (
    <View style={[styles.chip, { backgroundColor: theme.tile.background }]}>
      <Text style={[typography.bodyStrong, { color: theme.tile.text }]}>{text}</Text>
    </View>
  );
}

/**
 * The hero of the Home screen: the place, a big illustration of the weather, a giant temperature
 * that overlaps it, the conditions, a playful one-liner, and chips for feels-like and the range.
 */
export function CurrentConditionsCard({ placeName, current, theme }: CurrentConditionsCardProps) {
  const { preferences } = usePreferences();
  const { locale, messages } = useLocale();
  const { width } = useWindowDimensions();
  const unit = preferences.temperatureUnit;
  const fade = useFadeOnChange(`${current.observedAt}|${current.temperature}|${current.summary}`);
  const sceneSize = Math.min(MAX_SCENE_WIDTH, width - spacing.xl * 2);
  const temperature = (celsius: number) => formatTemperature(celsius, unit);

  return (
    <Animated.View
      accessible
      accessibilityLabel={describe(placeName, current, unit, messages)}
      style={[styles.container, fade]}
    >
      <Text accessibilityRole="header" style={[typography.hero, textShadow, { color: theme.text }]}>
        {placeName}
      </Text>
      <WeatherScene condition={current.condition} isDay={current.isDay} size={sceneSize} />
      <Text
        testID="current-temperature"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[typography.display, styles.temperature, textShadow, { color: theme.text }]}
      >
        {temperature(current.temperature)}
      </Text>
      <Text style={[typography.title, { color: theme.text }]}>{current.summary}</Text>
      <Text style={[typography.bodyStrong, { color: theme.textSecondary }]}>
        {moodLine(current.condition, current.isDay, current.temperature, locale)}
      </Text>
      <View style={styles.chips}>
        <Chip text={messages.current.feelsLike(temperature(current.feelsLike))} theme={theme} />
        <Chip
          text={messages.current.highLow(temperature(current.high), temperature(current.low))}
          theme={theme}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  // The temperature sits over the lower part of the illustration, for a layered look.
  temperature: { alignSelf: 'stretch', textAlign: 'center', marginTop: -48 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chip: { borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
});
