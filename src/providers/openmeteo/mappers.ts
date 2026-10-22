import { CURRENT_PLACE_ID, placeIdFor, roundCoordinate } from '@/domain/place';
import type {
  CurrentConditions,
  DailyForecastEntry,
  HourlyForecastEntry,
  Place,
  WeatherSnapshot,
} from '@/domain/types';

import { ProviderError } from '../weather-provider';
import { categoryFromWmo, describeWmo } from './codes';
import { forecastSchema, reverseSchema, searchSchema, type ForecastResponse } from './schemas';

const HOURLY_LIMIT = 24;
const DAILY_LIMIT = 7;
const HOUR = 3600;

export interface MapContext {
  placeId: string;
  /** Epoch seconds at which the response was received. */
  fetchedAt: number;
  /** Language of the condition names; English when omitted. */
  locale?: string;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));
const percent = (value: number | null | undefined) => clamp(Math.round(value ?? 0), 0, 100);
const wrapDegrees = (degrees: number) => ((Math.round(degrees) % 360) + 360) % 360;

function malformed(what: string, issuePaths: string[]): ProviderError {
  // Field paths only: values could contain location data and must not reach logs.
  return new ProviderError(
    'malformed-response',
    `Invalid ${what} response: ${issuePaths.join(', ')}`,
  );
}

/** Index of the first hourly slot at or after the hour containing `now`, or -1. */
function currentHourIndex(hourly: ForecastResponse['hourly'], now: number): number {
  const hourStart = now - (now % HOUR);
  return hourly.time.findIndex((time) => time >= hourStart);
}

function mapHourly(
  hourly: ForecastResponse['hourly'],
  startIndex: number,
  locale: string | undefined,
): HourlyForecastEntry[] {
  const entries: HourlyForecastEntry[] = [];
  for (let i = startIndex; i < hourly.time.length && entries.length < HOURLY_LIMIT; i++) {
    const temperature = hourly.temperature_2m[i];
    const code = hourly.weather_code[i];
    if (temperature == null || code == null) continue;
    entries.push({
      kind: 'hour',
      start: hourly.time[i]!,
      temperature,
      condition: categoryFromWmo(code),
      summary: describeWmo(code, locale),
      precipChance: percent(hourly.precipitation_probability?.[i]),
    });
  }
  return entries;
}

function mapDaily(
  daily: ForecastResponse['daily'],
  locale: string | undefined,
): DailyForecastEntry[] {
  const entries: DailyForecastEntry[] = [];
  for (let i = 0; i < daily.time.length && entries.length < DAILY_LIMIT; i++) {
    const high = daily.temperature_2m_max[i];
    const low = daily.temperature_2m_min[i];
    const code = daily.weather_code[i];
    if (high == null || low == null || code == null) continue;
    entries.push({
      kind: 'day',
      // The provider stamps each day at local midnight; the app uses local noon, like OpenWeather.
      start: daily.time[i]! + 12 * HOUR,
      high,
      low,
      condition: categoryFromWmo(code),
      summary: describeWmo(code, locale),
      precipChance: percent(daily.precipitation_probability_max?.[i]),
    });
  }
  return entries;
}

function mapCurrent(
  raw: ForecastResponse,
  hourIndex: number,
  today: DailyForecastEntry,
  locale: string | undefined,
): CurrentConditions {
  const { current, daily, hourly } = raw;
  const mapped: CurrentConditions = {
    observedAt: current.time,
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    condition: categoryFromWmo(current.weather_code),
    summary: describeWmo(current.weather_code, locale),
    isDay: current.is_day === 1,
    high: today.high,
    low: today.low,
    windSpeed: current.wind_speed_10m,
    humidity: clamp(current.relative_humidity_2m, 0, 100),
    pressure: current.pressure_msl,
    // Polar regions may have no sun events; 0 means "unavailable".
    sunrise: daily.sunrise[0] ?? 0,
    sunset: daily.sunset[0] ?? 0,
  };
  // Optional fields are only set when present, so absent data never becomes NaN or undefined keys.
  const uv = hourly.uv_index?.[hourIndex];
  const visibility = hourly.visibility?.[hourIndex];
  if (current.wind_direction_10m != null)
    mapped.windDirection = wrapDegrees(current.wind_direction_10m);
  if (current.wind_gusts_10m != null) mapped.windGust = current.wind_gusts_10m;
  if (uv != null) mapped.uvIndex = Math.max(0, uv);
  if (visibility != null) mapped.visibility = visibility;
  return mapped;
}

/** Validates an Open-Meteo forecast body and maps it. Throws ProviderError("malformed-response"). */
export function parseForecast(json: unknown, context: MapContext): WeatherSnapshot {
  const result = forecastSchema.safeParse(json);
  if (!result.success) {
    throw malformed(
      'forecast',
      result.error.issues.map((issue) => issue.path.join('.') || '(root)'),
    );
  }
  const raw = result.data;
  const hourIndex = currentHourIndex(raw.hourly, raw.current.time);
  const hourly = hourIndex === -1 ? [] : mapHourly(raw.hourly, hourIndex, context.locale);
  const daily = mapDaily(raw.daily, context.locale);
  const today = daily[0];
  if (hourly.length === 0 || !today) throw malformed('forecast', ['hourly', 'daily']);

  return {
    placeId: context.placeId,
    fetchedAt: context.fetchedAt,
    timeZone: raw.timezone,
    timeZoneOffset: raw.utc_offset_seconds,
    current: mapCurrent(raw, hourIndex, today, context.locale),
    hourly,
    daily,
    alerts: [],
  };
}

/** Maps place-search results to saved-kind Places keyed by their rounded coordinates. */
export function parseSearchResults(json: unknown): Place[] {
  const result = searchSchema.safeParse(json);
  if (!result.success) {
    throw malformed(
      'geocoding',
      result.error.issues.map((issue) => issue.path.join('.') || '(root)'),
    );
  }
  return (result.data.results ?? []).map((item) => ({
    id: placeIdFor(item.latitude, item.longitude),
    name: item.name,
    region: item.admin1 || null,
    country: item.country_code || item.country || '',
    lat: roundCoordinate(item.latitude),
    lon: roundCoordinate(item.longitude),
    timeZone: item.timezone || null,
    kind: 'saved',
    sortOrder: null,
  }));
}

/**
 * Names the device location from a reverse-geocoding body. The Place keeps the coordinates that
 * were asked about (rounded). No usable name at all yields null.
 */
export function parseReverseGeocode(
  json: unknown,
  requested: { lat: number; lon: number },
): Place | null {
  const result = reverseSchema.safeParse(json);
  if (!result.success) {
    throw malformed(
      'reverse geocoding',
      result.error.issues.map((issue) => issue.path.join('.') || '(root)'),
    );
  }
  const body = result.data;
  const name = body.city || body.locality || body.principalSubdivision || body.countryName;
  if (!name) return null;
  return {
    id: CURRENT_PLACE_ID,
    name,
    region:
      body.principalSubdivision && body.principalSubdivision !== name
        ? body.principalSubdivision
        : null,
    country: body.countryCode || body.countryName || '',
    lat: roundCoordinate(requested.lat),
    lon: roundCoordinate(requested.lon),
    timeZone: null,
    kind: 'current-location',
    sortOrder: null,
  };
}
