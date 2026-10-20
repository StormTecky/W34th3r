import type { ConditionCategory } from './types';

/**
 * A short, playful line about the weather, shown under the temperature. It is flavour text: the
 * real information is always in the text and numbers around it.
 */
const LINES: Record<ConditionCategory, string> = {
  clear: "Sun's out. Go play!",
  'partly-cloudy': 'A little bit of everything.',
  cloudy: 'Moody skies today.',
  drizzle: 'Just a light sprinkle.',
  rain: 'Grab an umbrella!',
  thunderstorm: 'Big sky drama.',
  snow: 'Snow day vibes.',
  sleet: 'Slushy out there.',
  'mist-fog': 'Foggy and mysterious.',
  'dust-smoke': 'Hazy out there.',
  'squall-tornado': 'Hold on to your hat!',
  unknown: 'Weather is weathering.',
};

export function moodLine(condition: ConditionCategory, isDay: boolean, celsius: number): string {
  if (celsius <= -15) return 'Brr. Seriously cold out.';
  if (celsius >= 35) return 'Scorcher. Stay hydrated!';
  if (condition === 'clear' && !isDay) return 'Clear skies. Look up!';
  if (condition === 'clear' && celsius < 15) return 'Crisp and bright out there.';
  return LINES[condition] ?? LINES.unknown;
}
