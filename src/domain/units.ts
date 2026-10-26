import { DEFAULT_LOCALE } from './locale';
import { messagesFor } from './messages';
import type { PrecipitationUnit, TemperatureUnit, UserPreferences, WindSpeedUnit } from './types';

const MM_PER_INCH = 25.4;
const METRES_PER_MILE = 1609.344;

const WIND_FACTORS: Record<WindSpeedUnit, number> = {
  ms: 1,
  kmh: 3.6,
  mph: 2.2369362920544,
  kn: 1.9438444924406,
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

const decimalFormats = new Map<string, Intl.NumberFormat>();

/**
 * Writes an already rounded number with the locale's decimal separator ("5.5", or "5,5" in French)
 * and never groups digits: pressure reads "1013 hPa", not "1,013 hPa".
 */
function decimal(value: number, locale: string, minDigits: number, maxDigits: number): string {
  const key = `${locale}|${minDigits}|${maxDigits}`;
  let format = decimalFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(locale, {
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
      useGrouping: false,
    });
    decimalFormats.set(key, format);
  }
  return format.format(value);
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

export function formatWindSpeed(
  metresPerSecond: number,
  unit: WindSpeedUnit,
  locale: string = DEFAULT_LOCALE,
): string {
  const value = convertWindSpeed(metresPerSecond, unit);
  const text = unit === 'ms' ? decimal(roundTo(value, 1), locale, 0, 1) : String(roundInt(value));
  return `${text} ${messagesFor(locale).units.windSpeed[unit].label}`;
}

export function convertPrecipitation(millimetres: number, unit: PrecipitationUnit): number {
  return unit === 'in' ? millimetres / MM_PER_INCH : millimetres;
}

export function formatPrecipitation(
  millimetres: number,
  unit: PrecipitationUnit,
  locale: string = DEFAULT_LOCALE,
): string {
  const value = convertPrecipitation(millimetres, unit);
  const label = messagesFor(locale).units.precipitation[unit].label;
  if (value === 0) return `0 ${label}`;
  const text =
    unit === 'in'
      ? decimal(roundTo(value, 2), locale, 2, 2)
      : decimal(roundTo(value, 1), locale, 0, 1);
  return `${text} ${label}`;
}

export function formatPressure(hectopascals: number, locale: string = DEFAULT_LOCALE): string {
  return `${roundInt(hectopascals)} ${messagesFor(locale).units.pressure}`;
}

export function formatPercent(value: number, locale: string = DEFAULT_LOCALE): string {
  return messagesFor(locale).units.percent(String(roundInt(value)));
}

/** Humidity is a percentage; clamp provider noise into 0-100. */
export function formatHumidity(value: number, locale: string = DEFAULT_LOCALE): string {
  return formatPercent(Math.min(100, Math.max(0, value)), locale);
}

/** Distance follows the wind-speed choice: miles for mph users, kilometres otherwise. */
export function formatVisibility(
  metres: number,
  windSpeedUnit: WindSpeedUnit,
  locale: string = DEFAULT_LOCALE,
): string {
  const { km, mi } = messagesFor(locale).units.distance;
  const [distance, label] =
    windSpeedUnit === 'mph' ? [metres / METRES_PER_MILE, mi] : [metres / 1000, km];
  return `${decimal(roundTo(distance, 1), locale, 0, 1)} ${label}`;
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
