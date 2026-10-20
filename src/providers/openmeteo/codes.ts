import type { ConditionCategory } from '@/domain/types';

/** WMO weather interpretation codes as used by Open-Meteo: category and plain-English summary. */
const CODES: Readonly<Record<number, readonly [ConditionCategory, string]>> = {
  0: ['clear', 'Clear sky'],
  1: ['clear', 'Mainly clear'],
  2: ['partly-cloudy', 'Partly cloudy'],
  3: ['cloudy', 'Overcast'],
  45: ['mist-fog', 'Fog'],
  48: ['mist-fog', 'Rime fog'],
  51: ['drizzle', 'Light drizzle'],
  53: ['drizzle', 'Drizzle'],
  55: ['drizzle', 'Heavy drizzle'],
  56: ['sleet', 'Freezing drizzle'],
  57: ['sleet', 'Heavy freezing drizzle'],
  61: ['rain', 'Light rain'],
  63: ['rain', 'Moderate rain'],
  65: ['rain', 'Heavy rain'],
  66: ['sleet', 'Freezing rain'],
  67: ['sleet', 'Heavy freezing rain'],
  71: ['snow', 'Light snow'],
  73: ['snow', 'Snow'],
  75: ['snow', 'Heavy snow'],
  77: ['snow', 'Snow grains'],
  80: ['rain', 'Light showers'],
  81: ['rain', 'Showers'],
  82: ['rain', 'Violent showers'],
  85: ['snow', 'Light snow showers'],
  86: ['snow', 'Snow showers'],
  95: ['thunderstorm', 'Thunderstorm'],
  96: ['thunderstorm', 'Thunderstorm with hail'],
  99: ['thunderstorm', 'Severe thunderstorm with hail'],
};

export function categoryFromWmo(code: number): ConditionCategory {
  return CODES[code]?.[0] ?? 'unknown';
}

export function describeWmo(code: number): string {
  return CODES[code]?.[1] ?? 'Unknown conditions';
}
