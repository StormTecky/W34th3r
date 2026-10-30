import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { Messages } from '@/domain/messages';
import { moodLine } from '@/domain/mood';
import type { ConditionCategory, CurrentConditions } from '@/domain/types';
import { formatPercent, formatTemperature } from '@/domain/units';
import type { Moment } from '@/features/forecast/scrub';
import { usePreferences } from '@/features/settings/use-preferences';
import { useLocale } from '@/lib/use-locale';
import { useLayout } from '@/theme/layout';
import { WeatherScene } from '@/theme/scenes/WeatherScene';
import type { WeatherTheme } from '@/theme/theme-engine';
import { radii, spacing, textShadow, typography } from '@/theme/tokens';
import { useFadeOnChange } from '@/theme/use-fade-on-change';

export interface CurrentConditionsCardProps {
  placeName: string;
  current: CurrentConditions;
  theme: WeatherTheme;
  /** Another time chosen on the time-travel bar; overrides the live conditions while set. */
  moment?: Moment | null;
}

/** Chances below this are not worth a chip. */
const MIN_CHIP_PRECIP = 10;

/** What the hero shows: the live conditions, or the chosen moment. */
interface Shown {
  temperature: number;
  condition: ConditionCategory;
  isDay: boolean;
  summary: string;
}

function shownFor(current: CurrentConditions, moment?: Moment | null): Shown {
  return moment ?? current;
}

/** Spoken description of the headline conditions, in the user's units. */
function describe(
  placeName: string,
  current: CurrentConditions,
  moment: Moment | null | undefined,
  units: 'c' | 'f',
  { spoken, current: text }: Messages,
): string {
  const whole = (celsius: number) => formatTemperature(celsius, units).replace('°', '');
  const parts = moment
    ? [placeName, spoken.degrees(whole(moment.temperature)), moment.summary, moment.dayTimeLabel]
    : [
        placeName,
        spoken.degrees(whole(current.temperature)),
        current.summary,
        text.spokenFeelsLike(whole(current.feelsLike)),
        text.spokenHighLow(whole(current.high), whole(current.low)),
      ];
  return parts.join('. ') + '.';
}

/** The pills under the conditions: feels-like and range now, or the time and rain chance later. */
function chipTexts(
  current: CurrentConditions,
  moment: Moment | null | undefined,
  temperature: (celsius: number) => string,
  locale: string,
  { current: text }: Messages,
): string[] {
  if (!moment) {
    return [
      text.feelsLike(temperature(current.feelsLike)),
      text.highLow(temperature(current.high), temperature(current.low)),
    ];
  }
  const chips = [moment.dayTimeLabel];
  if (moment.precipChance >= MIN_CHIP_PRECIP) {
    const percent = formatPercent(moment.precipChance, locale);
    const snowy = moment.condition === 'snow' || moment.condition === 'sleet';
    chips.push(snowy ? text.snowChance(percent) : text.rainChance(percent));
  }
  return chips;
}

function Chips({ texts, theme }: { texts: string[]; theme: WeatherTheme }) {
  return (
    <View style={styles.chips}>
      {texts.map((text) => (
        <View key={text} style={[styles.chip, { backgroundColor: theme.tile.background }]}>
          <Text style={[typography.bodyStrong, { color: theme.tile.text }]}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

interface HeadlineProps {
  shown: Shown;
  theme: WeatherTheme;
  locale: string;
  temperature: (celsius: number) => string;
}

/** The giant temperature, the conditions and the playful one-liner. */
function Headline({ shown, theme, locale, temperature }: HeadlineProps) {
  return (
    <>
      <Text
        testID="current-temperature"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[typography.display, styles.temperature, textShadow, { color: theme.text }]}
      >
        {temperature(shown.temperature)}
      </Text>
      <Text style={[typography.title, { color: theme.text }]}>{shown.summary}</Text>
      <Text style={[typography.bodyStrong, { color: theme.textSecondary }]}>
        {moodLine(shown.condition, shown.isDay, shown.temperature, locale)}
      </Text>
    </>
  );
}

/**
 * The hero of the Home screen: the place, a big illustration of the weather, a giant temperature
 * that overlaps it, the conditions, a playful one-liner, and pills with the details.
 */
export function CurrentConditionsCard({
  placeName,
  current,
  theme,
  moment,
}: CurrentConditionsCardProps) {
  const { preferences } = usePreferences();
  const { locale, messages } = useLocale();
  const unit = preferences.temperatureUnit;
  const shown = shownFor(current, moment);
  // While travelling in time the numbers change constantly; only dip the opacity for live updates.
  const fade = useFadeOnChange(
    moment ? 'time-travel' : `${current.observedAt}|${current.temperature}|${current.summary}`,
  );
  const { sceneSize } = useLayout();
  const temperature = (celsius: number) => formatTemperature(celsius, unit);

  return (
    <Animated.View
      accessible
      accessibilityLabel={describe(placeName, current, moment, unit, messages)}
      style={[styles.container, fade]}
    >
      <Text accessibilityRole="header" style={[typography.hero, textShadow, { color: theme.text }]}>
        {placeName}
      </Text>
      <WeatherScene condition={shown.condition} isDay={shown.isDay} size={sceneSize} />
      <Headline shown={shown} theme={theme} locale={locale} temperature={temperature} />
      <Chips texts={chipTexts(current, moment, temperature, locale, messages)} theme={theme} />
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
