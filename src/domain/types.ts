/**
 * Domain types for W34th3r. Pure TypeScript: no React Native, network, or provider imports.
 *
 * All weather values are metric (degrees C, m/s, mm, hPa, metres) and all instants are Unix epoch
 * seconds (UTC). Conversion to user units and place-local display happens at presentation time.
 */

export const CONDITION_CATEGORIES = [
  'clear',
  'partly-cloudy',
  'cloudy',
  'drizzle',
  'rain',
  'thunderstorm',
  'snow',
  'sleet',
  'mist-fog',
  'dust-smoke',
  'squall-tornado',
  'unknown',
] as const;

export type ConditionCategory = (typeof CONDITION_CATEGORIES)[number];

export type PlaceKind = 'current-location' | 'saved';

export interface Place {
  /** `"current"` for the device location, otherwise `"<lat>,<lon>"` rounded to 2 decimals. */
  id: string;
  /** Display name (city/locality). Non-empty. */
  name: string;
  /** State/province, for disambiguation. */
  region: string | null;
  /** ISO 3166 country code. */
  country: string;
  /** -90..90 */
  lat: number;
  /** -180..180 */
  lon: number;
  /** IANA time zone; filled from the first weather response. */
  timeZone: string | null;
  kind: PlaceKind;
  /** Position in the saved list; null for the current-location place. */
  sortOrder: number | null;
}

export interface CurrentConditions {
  observedAt: number;
  /** degrees C */
  temperature: number;
  /** degrees C */
  feelsLike: number;
  condition: ConditionCategory;
  summary: string;
  isDay: boolean;
  /** Today's high, degrees C (from `daily[0]`). */
  high: number;
  /** Today's low, degrees C (from `daily[0]`). */
  low: number;
  /** m/s */
  windSpeed: number;
  /** Degrees 0-359. */
  windDirection?: number;
  /** m/s */
  windGust?: number;
  /** Percent 0-100. */
  humidity: number;
  /** >= 0. Absent means "unavailable". */
  uvIndex?: number;
  /** metres */
  visibility?: number;
  /** hPa */
  pressure: number;
  sunrise: number;
  sunset: number;
}

interface ForecastEntryBase {
  /** Epoch seconds, period start. */
  start: number;
  condition: ConditionCategory;
  summary: string;
  /** Percent 0-100. */
  precipChance: number;
}

export interface HourlyForecastEntry extends ForecastEntryBase {
  kind: 'hour';
  /** degrees C */
  temperature: number;
}

export interface DailyForecastEntry extends ForecastEntryBase {
  kind: 'day';
  /** degrees C */
  high: number;
  /** degrees C */
  low: number;
}

export const ALERT_SEVERITIES = ['minor', 'moderate', 'severe', 'extreme', 'unknown'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export interface WeatherAlert {
  /** Derived from sender + event + start for stable keys. */
  id: string;
  /** Headline, e.g. "Flood Warning". */
  event: string;
  /** Issuing agency. */
  sender: string;
  description: string;
  start: number;
  end: number;
  severity: AlertSeverity;
}

/** The full result of one successful provider fetch for a Place (the cacheable unit). */
export interface WeatherSnapshot {
  placeId: string;
  /** Epoch seconds when the snapshot was received; drives age/staleness. */
  fetchedAt: number;
  /** IANA time zone from the provider. */
  timeZone: string;
  /** Provider UTC offset in seconds, used only if the runtime rejects `timeZone`. */
  timeZoneOffset: number;
  current: CurrentConditions;
  /** Next 24 entries at most, ascending by `start`. */
  hourly: HourlyForecastEntry[];
  /** Next 7 entries at most, ascending by `start`. */
  daily: DailyForecastEntry[];
  alerts: WeatherAlert[];
}

export type TemperatureUnit = 'c' | 'f';
export type WindSpeedUnit = 'ms' | 'kmh' | 'mph' | 'kn';
export type PrecipitationUnit = 'mm' | 'in';
export type Appearance = 'system' | 'light' | 'dark';

export interface UserPreferences {
  temperatureUnit: TemperatureUnit;
  windSpeedUnit: WindSpeedUnit;
  precipitationUnit: PrecipitationUnit;
  appearance: Appearance;
  lastViewedPlaceId: string;
  hasSeenLocationPrompt: boolean;
}
