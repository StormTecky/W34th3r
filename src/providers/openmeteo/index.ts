import { roundCoordinate } from '@/domain/place';
import type { Place, WeatherSnapshot } from '@/domain/types';

import { createHttpClient, type HttpClient } from '../http-client';
import type { RequestOptions, WeatherProvider, WeatherTarget } from '../weather-provider';
import { parseForecast, parseReverseGeocode, parseSearchResults } from './mappers';

/**
 * Weather from Open-Meteo (https://open-meteo.com): free, no account and no API key. Place search
 * uses Open-Meteo's geocoding API. Open-Meteo has no reverse geocoding, so the device location is
 * named by BigDataCloud's free client-side service. Open-Meteo provides no weather alerts.
 */

export const OPEN_METEO_URLS = {
  forecast: 'https://api.open-meteo.com',
  geocoding: 'https://geocoding-api.open-meteo.com',
  reverse: 'https://api-bdc.io',
} as const;

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'is_day',
  'weather_code',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
];
const HOURLY_FIELDS = [
  'temperature_2m',
  'weather_code',
  'precipitation_probability',
  'uv_index',
  'visibility',
];
const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'precipitation_probability_max',
];

export interface OpenMeteoClients {
  forecast: HttpClient;
  geocoding: HttpClient;
  reverse: HttpClient;
}

export class OpenMeteoProvider implements WeatherProvider {
  private readonly clients: OpenMeteoClients;
  private readonly now: () => number;

  constructor(clients: OpenMeteoClients, options: { now?: () => number } = {}) {
    this.clients = clients;
    this.now = options.now ?? (() => Math.floor(Date.now() / 1000));
  }

  async getWeather(place: WeatherTarget, options?: RequestOptions): Promise<WeatherSnapshot> {
    const json = await this.clients.forecast.getJson(
      '/v1/forecast',
      {
        // Coarse coordinates are enough for weather and limit what leaves the device.
        latitude: roundCoordinate(place.lat),
        longitude: roundCoordinate(place.lon),
        current: CURRENT_FIELDS.join(','),
        hourly: HOURLY_FIELDS.join(','),
        daily: DAILY_FIELDS.join(','),
        timezone: 'auto',
        wind_speed_unit: 'ms',
        timeformat: 'unixtime',
        forecast_days: 8,
      },
      options,
    );
    return parseForecast(json, { placeId: place.id, fetchedAt: this.now() });
  }

  async searchPlaces(query: string, options?: RequestOptions): Promise<Place[]> {
    const text = query.trim();
    if (text === '') return [];
    const json = await this.clients.geocoding.getJson(
      '/v1/search',
      { name: text, count: 5, language: 'en', format: 'json' },
      options,
    );
    return parseSearchResults(json);
  }

  async reverseGeocode(lat: number, lon: number, options?: RequestOptions): Promise<Place | null> {
    const json = await this.clients.reverse.getJson(
      '/data/reverse-geocode-client',
      { latitude: roundCoordinate(lat), longitude: roundCoordinate(lon), localityLanguage: 'en' },
      options,
    );
    return parseReverseGeocode(json, { lat, lon });
  }
}

export interface OpenMeteoSetup {
  timeoutMs: number;
  retryDelayMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/** Builds the provider with one HTTP client per service. */
export function createOpenMeteoProvider(setup: OpenMeteoSetup): OpenMeteoProvider {
  const client = (baseUrl: string) =>
    createHttpClient({
      baseUrl,
      timeoutMs: setup.timeoutMs,
      retryDelayMs: setup.retryDelayMs,
      fetchImpl: setup.fetchImpl,
    });
  return new OpenMeteoProvider(
    {
      forecast: client(OPEN_METEO_URLS.forecast),
      geocoding: client(OPEN_METEO_URLS.geocoding),
      reverse: client(OPEN_METEO_URLS.reverse),
    },
    { now: setup.now },
  );
}
