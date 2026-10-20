import { isDayForInstant } from '@/domain/conditions';
import type { ConditionCategory, TemperatureUnit, WeatherSnapshot } from '@/domain/types';
import { formatHourLabel, relativeDayLabel } from '@/domain/time';
import { formatTemperature } from '@/domain/units';

export interface ForecastOptions {
  units: TemperatureUnit;
  /** Current time in epoch seconds, for "Now", "Today" and "Tomorrow". */
  now: number;
  locale?: string;
}

export interface HourlyRow {
  key: string;
  start: number;
  /** "Now" for the first entry, otherwise the place-local hour, e.g. "3 PM". */
  timeLabel: string;
  /** "Now", or the day and hour, e.g. "Tomorrow 12 AM". Names a moment for the time-travel bar. */
  dayTimeLabel: string;
  temperatureLabel: string;
  /** Degrees C. */
  temperature: number;
  condition: ConditionCategory;
  isDay: boolean;
  summary: string;
  /** Percent, 0-100. */
  precipChance: number;
  /** Shown from 10 percent upward; null hides negligible chances. */
  precipLabel: string | null;
  a11yLabel: string;
}

export interface DailyRow {
  key: string;
  start: number;
  dayLabel: string;
  highLabel: string;
  lowLabel: string;
  /** The day's low and high in degrees C, for colouring the range bar. */
  lowC: number;
  highC: number;
  /** Where this day's low and high sit within the week's range, 0..1. */
  rangeStart: number;
  rangeEnd: number;
  condition: ConditionCategory;
  summary: string;
  precipLabel: string | null;
  a11yLabel: string;
}

const MIN_VISIBLE_PRECIP = 10;

const precipLabel = (chance: number) => (chance >= MIN_VISIBLE_PRECIP ? `${chance}%` : null);
const precipSentence = (chance: number) => `${chance} percent chance of precipitation`;
const bare = (celsius: number, units: TemperatureUnit) =>
  formatTemperature(celsius, units).replace('°', '');

export function buildHourlyRows(snapshot: WeatherSnapshot, options: ForecastOptions): HourlyRow[] {
  const { timeZone, timeZoneOffset, current } = snapshot;
  const locale = options.locale ?? 'en-US';

  return snapshot.hourly.map((entry, index) => {
    const timeLabel =
      index === 0 ? 'Now' : formatHourLabel(entry.start, timeZone, locale, timeZoneOffset);
    return {
      key: String(entry.start),
      start: entry.start,
      timeLabel,
      dayTimeLabel:
        index === 0
          ? timeLabel
          : `${relativeDayLabel(entry.start, options.now, timeZone, locale, timeZoneOffset)} ${timeLabel}`,
      temperatureLabel: formatTemperature(entry.temperature, options.units),
      temperature: entry.temperature,
      precipChance: entry.precipChance,
      condition: entry.condition,
      isDay: isDayForInstant(entry.start, current.sunrise, current.sunset),
      summary: entry.summary,
      precipLabel: precipLabel(entry.precipChance),
      a11yLabel:
        [
          timeLabel,
          `${bare(entry.temperature, options.units)} degrees`,
          entry.summary,
          precipSentence(entry.precipChance),
        ].join(', ') + '.',
    };
  });
}

export function buildDailyRows(snapshot: WeatherSnapshot, options: ForecastOptions): DailyRow[] {
  const { timeZone, timeZoneOffset, daily } = snapshot;
  const locale = options.locale ?? 'en-US';
  const weekMin = Math.min(...daily.map((day) => day.low));
  const weekMax = Math.max(...daily.map((day) => day.high));
  const span = weekMax - weekMin;

  return daily.map((entry) => {
    const dayLabel = relativeDayLabel(entry.start, options.now, timeZone, locale, timeZoneOffset);
    return {
      key: String(entry.start),
      start: entry.start,
      dayLabel,
      highLabel: formatTemperature(entry.high, options.units),
      lowLabel: formatTemperature(entry.low, options.units),
      lowC: entry.low,
      highC: entry.high,
      rangeStart: span > 0 ? (entry.low - weekMin) / span : 0,
      rangeEnd: span > 0 ? (entry.high - weekMin) / span : 1,
      condition: entry.condition,
      summary: entry.summary,
      precipLabel: precipLabel(entry.precipChance),
      a11yLabel:
        [
          dayLabel,
          `high ${bare(entry.high, options.units)}`,
          `low ${bare(entry.low, options.units)}`,
          entry.summary,
          precipSentence(entry.precipChance),
        ].join(', ') + '.',
    };
  });
}
