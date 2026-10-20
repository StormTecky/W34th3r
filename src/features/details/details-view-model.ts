import { isDayAt } from '@/domain/conditions';
import type { AlertSeverity, WeatherAlert, WeatherSnapshot, WindSpeedUnit } from '@/domain/types';
import { dayKey, formatClockTime, relativeDayLabel } from '@/domain/time';
import { formatHumidity, formatPressure, formatVisibility, formatWindSpeed } from '@/domain/units';

export const UNAVAILABLE = 'Unavailable';

export interface DetailsOptions {
  windSpeedUnit: WindSpeedUnit;
  /** Current time in epoch seconds, for the sun position. */
  now: number;
  locale?: string;
}

const POINTS = [
  ['N', 'north'],
  ['NNE', 'north-northeast'],
  ['NE', 'northeast'],
  ['ENE', 'east-northeast'],
  ['E', 'east'],
  ['ESE', 'east-southeast'],
  ['SE', 'southeast'],
  ['SSE', 'south-southeast'],
  ['S', 'south'],
  ['SSW', 'south-southwest'],
  ['SW', 'southwest'],
  ['WSW', 'west-southwest'],
  ['W', 'west'],
  ['WNW', 'west-northwest'],
  ['NW', 'northwest'],
  ['NNW', 'north-northwest'],
] as const;

/** The 16-point compass direction for a bearing in degrees (any value; it wraps). */
export function compassPoint(degrees: number): { abbreviation: string; name: string } {
  const wrapped = ((degrees % 360) + 360) % 360;
  const [abbreviation, name] = POINTS[Math.round(wrapped / 22.5) % 16]!;
  return { abbreviation, name };
}

export type UvCategory = 'Low' | 'Moderate' | 'High' | 'Very high' | 'Extreme';

const UV_ADVICE: Record<UvCategory, string> = {
  Low: 'No protection needed.',
  Moderate: 'Wear sunscreen and sunglasses.',
  High: 'Seek shade around midday.',
  'Very high': 'Avoid the sun around midday.',
  Extreme: 'Stay out of the sun if you can.',
};

/** WHO categories, applied to the rounded index. */
export function uvCategory(uvi: number): UvCategory {
  const index = Math.round(uvi);
  if (index <= 2) return 'Low';
  if (index <= 5) return 'Moderate';
  if (index <= 7) return 'High';
  if (index <= 10) return 'Very high';
  return 'Extreme';
}

const UV_SCALE_TOP = 11;

export interface WindDetails {
  speedLabel: string;
  gustLabel: string | null;
  directionLabel: string | null;
  degrees: number | null;
  a11yLabel: string;
}

export interface UvDetails {
  available: boolean;
  label: string;
  category: UvCategory | null;
  advice: string | null;
  value: number | null;
  /** Position on the 0-11 scale, 0..1. */
  fraction: number;
}

export interface SunDetails {
  available: boolean;
  sunriseLabel: string;
  sunsetLabel: string;
  /** How far the sun has travelled between sunrise (0) and sunset (1). */
  progress: number;
  isDay: boolean;
}

export interface DetailsModel {
  wind: WindDetails;
  humidity: { label: string; value: number };
  uv: UvDetails;
  visibility: { available: boolean; label: string };
  pressure: { label: string };
  sun: SunDetails;
}

function buildWind(snapshot: WeatherSnapshot, unit: WindSpeedUnit): WindDetails {
  const { windSpeed, windGust, windDirection } = snapshot.current;
  const speedLabel = formatWindSpeed(windSpeed, unit);
  const gustLabel = windGust === undefined ? null : formatWindSpeed(windGust, unit);
  const point = windDirection === undefined ? null : compassPoint(windDirection);
  const spoken = [
    `Wind ${speedLabel}${point ? ` from ${point.name}` : ''}`,
    gustLabel ? `gusts ${gustLabel}` : null,
  ];
  return {
    speedLabel,
    gustLabel,
    directionLabel: point?.abbreviation ?? null,
    degrees: windDirection ?? null,
    a11yLabel: spoken.filter(Boolean).join(', '),
  };
}

function buildUv(uvIndex: number | undefined): UvDetails {
  if (uvIndex === undefined) {
    return {
      available: false,
      label: UNAVAILABLE,
      category: null,
      advice: null,
      value: null,
      fraction: 0,
    };
  }
  const category = uvCategory(uvIndex);
  return {
    available: true,
    label: String(Math.round(uvIndex)),
    category,
    advice: UV_ADVICE[category],
    value: uvIndex,
    fraction: Math.min(1, Math.max(0, uvIndex / UV_SCALE_TOP)),
  };
}

function buildSun(snapshot: WeatherSnapshot, options: DetailsOptions): SunDetails {
  const { sunrise, sunset } = snapshot.current;
  const { timeZone, timeZoneOffset } = snapshot;
  const locale = options.locale ?? 'en-US';
  const available = sunrise > 0 && sunset > sunrise;
  const time = (epoch: number) => formatClockTime(epoch, timeZone, locale, timeZoneOffset);
  return {
    available,
    sunriseLabel: available ? time(sunrise) : UNAVAILABLE,
    sunsetLabel: available ? time(sunset) : UNAVAILABLE,
    progress: available
      ? Math.min(1, Math.max(0, (options.now - sunrise) / (sunset - sunrise)))
      : 0,
    isDay: isDayAt(options.now, sunrise, sunset),
  };
}

export function buildDetails(snapshot: WeatherSnapshot, options: DetailsOptions): DetailsModel {
  const { current } = snapshot;
  const visibility = current.visibility;
  return {
    wind: buildWind(snapshot, options.windSpeedUnit),
    humidity: {
      label: formatHumidity(current.humidity),
      value: Math.min(100, Math.max(0, current.humidity)),
    },
    uv: buildUv(current.uvIndex),
    visibility:
      visibility === undefined
        ? { available: false, label: UNAVAILABLE }
        : { available: true, label: formatVisibility(visibility, options.windSpeedUnit) },
    pressure: { label: formatPressure(current.pressure) },
    sun: buildSun(snapshot, options),
  };
}

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  extreme: 'Extreme',
  severe: 'Severe',
  moderate: 'Moderate',
  minor: 'Minor',
  unknown: 'Alert',
};

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  extreme: 0,
  severe: 1,
  moderate: 2,
  minor: 3,
  unknown: 4,
};

/** Most severe first, then earliest start. Returns a new array. */
export function sortAlerts(alerts: readonly WeatherAlert[]): WeatherAlert[] {
  return [...alerts].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.start - b.start,
  );
}

/** "Today 5:00 PM – Tomorrow 5:00 AM", in the place's local time. */
export function alertPeriodLabel(
  alert: WeatherAlert,
  timeZone: string,
  now: number,
  offsetSeconds?: number,
  locale = 'en-US',
): string {
  const part = (epoch: number, withDay: boolean) => {
    const clock = formatClockTime(epoch, timeZone, locale, offsetSeconds);
    return withDay
      ? `${relativeDayLabel(epoch, now, timeZone, locale, offsetSeconds)} ${clock}`
      : clock;
  };
  const sameDay =
    dayKey(alert.start, timeZone, offsetSeconds) === dayKey(alert.end, timeZone, offsetSeconds);
  return `${part(alert.start, true)} – ${part(alert.end, !sameDay)}`;
}
