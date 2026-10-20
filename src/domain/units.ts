import type { PrecipitationUnit, TemperatureUnit, UserPreferences, WindSpeedUnit } from './types';

const MM_PER_INCH = 25.4;
const METRES_PER_MILE = 1609.344;

const WIND_FACTORS: Record<WindSpeedUnit, number> = {
  ms: 1,
  kmh: 3.6,
  mph: 2.2369362920544,
  kn: 1.9438444924406,
};

const WIND_LABELS: Record<WindSpeedUnit, string> = {
  ms: 'm/s',
  kmh: 'km/h',
  mph: 'mph',
  kn: 'kn',
};

/** Rounds to an integer and never returns negative zero. */
function roundInt(value: number): number {
  const rounded = Math.round(value);
  return rounded === 0 ? 0 : rounded;
}

/** Rounds to `digits` decimals and drops trailing zeros ("5.0" becomes 5). */
function roundTo(value: number, digits: number): number {
  const rounded = Number(value.toFixed(digits));
  return rounded === 0 ? 0 : rounded;
}

export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

export function convertTemperature(celsius: number, unit: TemperatureUnit): number {
  return unit === 'f' ? celsiusToFahrenheit(celsius) : celsius;
}

/** Rounded value with a degree sign, e.g. "21°". */
export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  return `${roundInt(convertTemperature(celsius, unit))}°`;
}

export function convertWindSpeed(metresPerSecond: number, unit: WindSpeedUnit): number {
  return metresPerSecond * WIND_FACTORS[unit];
}

export function formatWindSpeed(metresPerSecond: number, unit: WindSpeedUnit): string {
  const value = convertWindSpeed(metresPerSecond, unit);
  const text = unit === 'ms' ? roundTo(value, 1) : roundInt(value);
  return `${text} ${WIND_LABELS[unit]}`;
}

export function convertPrecipitation(millimetres: number, unit: PrecipitationUnit): number {
  return unit === 'in' ? millimetres / MM_PER_INCH : millimetres;
}

export function formatPrecipitation(millimetres: number, unit: PrecipitationUnit): string {
  const value = convertPrecipitation(millimetres, unit);
  if (value === 0) return `0 ${unit}`;
  return unit === 'in' ? `${value.toFixed(2)} in` : `${roundTo(value, 1)} mm`;
}

export function formatPressure(hectopascals: number): string {
  return `${roundInt(hectopascals)} hPa`;
}

export function formatPercent(value: number): string {
  return `${roundInt(value)}%`;
}

/** Humidity is a percentage; clamp provider noise into 0-100. */
export function formatHumidity(value: number): string {
  return formatPercent(Math.min(100, Math.max(0, value)));
}

/** Distance follows the wind-speed choice: miles for mph users, kilometres otherwise. */
export function formatVisibility(metres: number, windSpeedUnit: WindSpeedUnit): string {
  if (windSpeedUnit === 'mph') return `${roundTo(metres / METRES_PER_MILE, 1)} mi`;
  return `${roundTo(metres / 1000, 1)} km`;
}

export type UnitDefaults = Pick<
  UserPreferences,
  'temperatureUnit' | 'windSpeedUnit' | 'precipitationUnit'
>;

/** Imperial defaults for the US, metric everywhere else (including unknown regions). */
export function defaultUnitsForRegion(regionCode: string | null | undefined): UnitDefaults {
  if (regionCode?.toUpperCase() === 'US') {
    return { temperatureUnit: 'f', windSpeedUnit: 'mph', precipitationUnit: 'in' };
  }
  return { temperatureUnit: 'c', windSpeedUnit: 'kmh', precipitationUnit: 'mm' };
}
