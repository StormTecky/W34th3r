import type {
  ConditionCategory,
  CurrentConditions,
  DailyForecastEntry,
  HourlyForecastEntry,
  WeatherAlert,
  WeatherSnapshot,
} from '@/domain/types';
import { localNoon } from '@/domain/time';
import { PROVIDER_ERROR_KINDS, type ProviderErrorKind } from '../weather-provider';

/**
 * Deterministic weather scenarios for tests and for E2E builds that run without a network. They are
 * expressed in domain types, not OpenWeather shapes.
 */

export const DATA_SCENARIOS = [
  'clear-day',
  'rain-day',
  'rain-night',
  'snow',
  'thunderstorm',
  'extreme-values',
  'missing-optionals',
  'alerts-active',
] as const;

export type DataScenario = (typeof DATA_SCENARIOS)[number];
export type FakeScenario = DataScenario | ProviderErrorKind;

export const FAKE_SCENARIOS: readonly FakeScenario[] = [...DATA_SCENARIOS, ...PROVIDER_ERROR_KINDS];

export function isErrorScenario(scenario: FakeScenario): scenario is ProviderErrorKind {
  return (PROVIDER_ERROR_KINDS as readonly string[]).includes(scenario);
}

interface Shape {
  condition: ConditionCategory;
  summary: string;
  isDay: boolean;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection?: number;
  windGust?: number;
  uvIndex?: number;
  visibility?: number;
  pressure: number;
  precipBase: number;
}

const SHAPES: Record<DataScenario, Shape> = {
  'clear-day': {
    condition: 'clear',
    summary: 'Clear sky',
    isDay: true,
    temperature: 21.4,
    feelsLike: 20.8,
    humidity: 48,
    windSpeed: 3.2,
    windDirection: 250,
    windGust: 6.1,
    uvIndex: 5.2,
    visibility: 10000,
    pressure: 1018,
    precipBase: 0,
  },
  'rain-day': {
    condition: 'rain',
    summary: 'Moderate rain',
    isDay: true,
    temperature: 12.6,
    feelsLike: 11.4,
    humidity: 86,
    windSpeed: 5.6,
    windDirection: 40,
    windGust: 10.3,
    uvIndex: 1.2,
    visibility: 6000,
    pressure: 1005,
    precipBase: 70,
  },
  'rain-night': {
    condition: 'rain',
    summary: 'Moderate rain',
    isDay: false,
    temperature: 11.2,
    feelsLike: 9.8,
    humidity: 88,
    windSpeed: 6.1,
    windDirection: 40,
    windGust: 11.3,
    uvIndex: 0,
    visibility: 6000,
    pressure: 1004,
    precipBase: 70,
  },
  snow: {
    condition: 'snow',
    summary: 'Light snow',
    isDay: true,
    temperature: -3.4,
    feelsLike: -8.1,
    humidity: 90,
    windSpeed: 4.4,
    windDirection: 320,
    windGust: 8.0,
    uvIndex: 1,
    visibility: 3000,
    pressure: 998,
    precipBase: 60,
  },
  thunderstorm: {
    condition: 'thunderstorm',
    summary: 'Thunderstorm with heavy rain',
    isDay: true,
    temperature: 27.9,
    feelsLike: 32.5,
    humidity: 82,
    windSpeed: 9.5,
    windDirection: 120,
    windGust: 18.2,
    uvIndex: 7.4,
    visibility: 5000,
    pressure: 1006,
    precipBase: 80,
  },
  'extreme-values': {
    condition: 'snow',
    summary: 'Heavy snow',
    isDay: true,
    temperature: -40,
    feelsLike: -52.5,
    humidity: 100,
    windSpeed: 70,
    windDirection: 359,
    windGust: 95,
    uvIndex: 15.2,
    visibility: 0,
    pressure: 1060,
    precipBase: 100,
  },
  'missing-optionals': {
    condition: 'partly-cloudy',
    summary: 'Scattered clouds',
    isDay: true,
    temperature: 17.6,
    feelsLike: 16.9,
    humidity: 61,
    windSpeed: 4.8,
    pressure: 1013,
    precipBase: 10,
  },
  'alerts-active': {
    condition: 'thunderstorm',
    summary: 'Thunderstorm',
    isDay: true,
    temperature: 29.3,
    feelsLike: 34,
    humidity: 79,
    windSpeed: 9.5,
    windDirection: 120,
    windGust: 18.2,
    uvIndex: 8.1,
    visibility: 8000,
    pressure: 1009,
    precipBase: 60,
  },
};

const HOUR = 3600;
const DAY = 86_400;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildHourly(shape: Shape, now: number): HourlyForecastEntry[] {
  const first = now - (now % HOUR);
  return Array.from({ length: 24 }, (_, i) => ({
    kind: 'hour' as const,
    start: first + i * HOUR,
    temperature: round1(shape.temperature + 3 * Math.sin(((i - 6) / 24) * 2 * Math.PI)),
    condition: shape.condition,
    summary: shape.summary,
    precipChance: Math.min(100, shape.precipBase + (i % 5) * 3),
  }));
}

function buildDaily(shape: Shape, now: number, timeZone: string): DailyForecastEntry[] {
  return Array.from({ length: 7 }, (_, i) => ({
    kind: 'day' as const,
    // Like the real provider, each day is stamped with local noon of that calendar day.
    start: localNoon(now + i * DAY, timeZone),
    high: round1(shape.temperature + 4 + (i % 3)),
    low: round1(shape.temperature - 6 + (i % 2)),
    condition: shape.condition,
    summary: shape.summary,
    precipChance: Math.min(100, shape.precipBase + i * 4),
  }));
}

function buildAlerts(now: number): WeatherAlert[] {
  return [
    {
      id: 'NWS Fake|Flood Warning|' + now,
      event: 'Flood Warning',
      sender: 'NWS Fake',
      description: 'Flooding is occurring or imminent. Do not drive through flooded roadways.',
      start: now - 2 * HOUR,
      end: now + 10 * HOUR,
      severity: 'severe',
    },
    {
      id: 'NWS Fake|Severe Thunderstorm Watch|' + now,
      event: 'Severe Thunderstorm Watch',
      sender: 'NWS Fake',
      description: 'Conditions are favorable for severe thunderstorms.',
      start: now - 3 * HOUR,
      end: now + 6 * HOUR,
      severity: 'moderate',
    },
  ];
}

export interface BuildOptions {
  placeId: string;
  timeZone: string;
  /** Epoch seconds. */
  now: number;
}

export function buildSnapshot(scenario: DataScenario, options: BuildOptions): WeatherSnapshot {
  const { now } = options;
  const shape = SHAPES[scenario];
  const hourly = buildHourly(shape, now);
  const daily = buildDaily(shape, now, options.timeZone);

  const current: CurrentConditions = {
    observedAt: now,
    temperature: shape.temperature,
    feelsLike: shape.feelsLike,
    condition: shape.condition,
    summary: shape.summary,
    isDay: shape.isDay,
    high: daily[0]!.high,
    low: daily[0]!.low,
    windSpeed: shape.windSpeed,
    humidity: shape.humidity,
    pressure: shape.pressure,
    // Day: sun rose 4 h ago and sets in 8 h. Night: sun set 2 h ago.
    sunrise: shape.isDay ? now - 4 * HOUR : now - 14 * HOUR,
    sunset: shape.isDay ? now + 8 * HOUR : now - 2 * HOUR,
  };
  if (shape.windDirection !== undefined) current.windDirection = shape.windDirection;
  if (shape.windGust !== undefined) current.windGust = shape.windGust;
  if (shape.uvIndex !== undefined) current.uvIndex = shape.uvIndex;
  if (shape.visibility !== undefined) current.visibility = shape.visibility;

  return {
    placeId: options.placeId,
    fetchedAt: now,
    timeZone: options.timeZone,
    timeZoneOffset: 0,
    current,
    hourly,
    daily,
    alerts: scenario === 'alerts-active' ? buildAlerts(now) : [],
  };
}
