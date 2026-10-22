import type { ConditionCategory } from './types';
import { DEFAULT_LOCALE } from './locale';
import { messagesFor } from './messages';

/**
 * A short, playful line about the weather, shown under the temperature. It is flavour text: the
 * real information is always in the text and numbers around it. The lines themselves live in the
 * message catalogs, one voice per language.
 */
export function moodLine(
  condition: ConditionCategory,
  isDay: boolean,
  celsius: number,
  locale: string = DEFAULT_LOCALE,
): string {
  const { lines, frigid, scorching, clearNight, clearCool } = messagesFor(locale).mood;
  if (celsius <= -15) return frigid;
  if (celsius >= 35) return scorching;
  if (condition === 'clear' && !isDay) return clearNight;
  if (condition === 'clear' && celsius < 15) return clearCool;
  return lines[condition] ?? lines.unknown;
}
