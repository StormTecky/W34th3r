import { categoryFromOpenWeatherId, isDayAt } from '@/domain/conditions';
import { CURRENT_PLACE_ID, placeIdFor, roundCoordinate } from '@/domain/place';
import type {
  AlertSeverity,
  CurrentConditions,
  DailyForecastEntry,
  HourlyForecastEntry,
  Place,
  WeatherAlert,
  WeatherSnapshot,
} from '@/domain/types';

import { ProviderError } from '../weather-provider';
import {
  geocodingSchema,
  oneCallSchema,
  type GeocodingItem,
  type OneCallResponse,
} from './schemas';

const HOURLY_LIMIT = 24;
const DAILY_LIMIT = 7;

export interface MapContext {
  placeId: string;
  /** Epoch seconds at which the response was received. */
  fetchedAt: number;
}

type WeatherList = OneCallResponse['current']['weather'];

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function describe(weather: WeatherList): {
  condition: ReturnType<typeof categoryFromOpenWeatherId>;
  summary: string;
} {
  const entry = weather[0]!;
  const text = entry.description.trim();
  return {
    condition: categoryFromOpenWeatherId(entry.id),
    summary: text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : 'Unknown conditions',
  };
}

function precipChance(pop: number | null | undefined): number {
  return clamp(Math.round((pop ?? 0) * 100), 0, 100);
}

/** Wraps any degree value into the integer range 0-359. */
function normaliseDegrees(degrees: number): number {
  return ((Math.round(degrees) % 360) + 360) % 360;
}

function severityFromEvent(event: string): AlertSeverity {
  const text = event.toLowerCase();
  if (/\b(emergency|extreme)\b/.test(text)) return 'extreme';
  if (/\bwarning\b/.test(text)) return 'severe';
  if (/\bwatch\b/.test(text)) return 'moderate';
  if (/\badvisory\b/.test(text)) return 'minor';
  return 'unknown';
}

function mapAlerts(alerts: OneCallResponse['alerts']): WeatherAlert[] {
  return (alerts ?? []).map((alert) => ({
    id: `${alert.sender_name}|${alert.event}|${alert.start}`,
    event: alert.event,
    sender: alert.sender_name,
    description: alert.description,
    start: alert.start,
    end: alert.end,
    severity: severityFromEvent(alert.event),
  }));
}

function mapHourly(entries: OneCallResponse['hourly']): HourlyForecastEntry[] {
  return [...entries]
    .sort((a, b) => a.dt - b.dt)
    .slice(0, HOURLY_LIMIT)
    .map((entry) => ({
      kind: 'hour',
      start: entry.dt,
      temperature: entry.temp,
      ...describe(entry.weather),
      precipChance: precipChance(entry.pop),
    }));
}

function sortDaily(entries: OneCallResponse['daily']): OneCallResponse['daily'] {
  return [...entries].sort((a, b) => a.dt - b.dt);
}

function mapDaily(entries: OneCallResponse['daily']): DailyForecastEntry[] {
  return entries.slice(0, DAILY_LIMIT).map((entry) => ({
    kind: 'day',
    start: entry.dt,
    high: entry.temp.max,
    low: entry.temp.min,
    ...describe(entry.weather),
    precipChance: precipChance(entry.pop),
  }));
}

function mapCurrent(
  raw: OneCallResponse,
  today: OneCallResponse['daily'][number],
): CurrentConditions {
  const { current } = raw;
  // Polar regions may report no sun events at all; 0 means "unavailable".
  const sunrise = current.sunrise ?? today.sunrise ?? 0;
  const sunset = current.sunset ?? today.sunset ?? 0;

  const mapped: CurrentConditions = {
    observedAt: current.dt,
    temperature: current.temp,
    feelsLike: current.feels_like,
    ...describe(current.weather),
    isDay: isDayAt(current.dt, sunrise, sunset),
    high: today.temp.max,
    low: today.temp.min,
    windSpeed: current.wind_speed,
    humidity: clamp(current.humidity, 0, 100),
    pressure: current.pressure,
    sunrise,
    sunset,
  };
  // Optional fields are only set when present, so absent data never becomes NaN or undefined keys.
  if (current.wind_deg != null) mapped.windDirection = normaliseDegrees(current.wind_deg);
  if (current.wind_gust != null) mapped.windGust = current.wind_gust;
  if (current.uvi != null) mapped.uvIndex = Math.max(0, current.uvi);
  if (current.visibility != null) mapped.visibility = current.visibility;
  return mapped;
}

export function mapOneCall(raw: OneCallResponse, context: MapContext): WeatherSnapshot {
  const daily = sortDaily(raw.daily);
  return {
    placeId: context.placeId,
    fetchedAt: context.fetchedAt,
    timeZone: raw.timezone,
    timeZoneOffset: raw.timezone_offset,
    current: mapCurrent(raw, daily[0]!),
    hourly: mapHourly(raw.hourly),
    daily: mapDaily(daily),
    alerts: mapAlerts(raw.alerts),
  };
}

/** Validates a raw One Call body and maps it. Throws ProviderError("malformed-response"). */
export function parseOneCall(json: unknown, context: MapContext): WeatherSnapshot {
  const result = oneCallSchema.safeParse(json);
  if (!result.success) {
    // Field paths only: values could contain location data and must not reach logs.
    const paths = result.error.issues.map((issue) => issue.path.join('.') || '(root)');
    throw new ProviderError('malformed-response', `Invalid One Call response: ${paths.join(', ')}`);
  }
  return mapOneCall(result.data, context);
}

function parseGeocoding(json: unknown): GeocodingItem[] {
  const result = geocodingSchema.safeParse(json);
  if (!result.success) {
    // Field paths only: values could contain location data and must not reach logs.
    const paths = result.error.issues.map((issue) => issue.path.join('.') || '(root)');
    throw new ProviderError(
      'malformed-response',
      `Invalid geocoding response: ${paths.join(', ')}`,
    );
  }
  return result.data;
}

/**
 * Names the device location from a reverse-geocoding body. The Place keeps the coordinates that
 * were asked about (rounded), not the geocoder's, because weather is fetched for those.
 * An empty result means "no name available" and yields null.
 */
export function parseReverseGeocode(
  json: unknown,
  requested: { lat: number; lon: number },
): Place | null {
  const first = parseGeocoding(json)[0];
  if (!first) return null;
  return {
    id: CURRENT_PLACE_ID,
    name: first.name,
    region: first.state ?? null,
    country: first.country,
    lat: roundCoordinate(requested.lat),
    lon: roundCoordinate(requested.lon),
    timeZone: null,
    kind: 'current-location',
    sortOrder: null,
  };
}

/** Maps a place-search body to saved-kind Places keyed by their rounded coordinates. */
export function parseSearchResults(json: unknown): Place[] {
  return parseGeocoding(json).map((item) => ({
    id: placeIdFor(item.lat, item.lon),
    name: item.name,
    region: item.state ?? null,
    country: item.country,
    lat: roundCoordinate(item.lat),
    lon: roundCoordinate(item.lon),
    timeZone: null,
    kind: 'saved',
    sortOrder: null,
  }));
}
