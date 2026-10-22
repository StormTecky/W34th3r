import { languageOf } from '@/domain/locale';
import { roundCoordinate } from '@/domain/place';
import type { Place, WeatherSnapshot } from '@/domain/types';

import { type RequestOptions, type WeatherProvider, type WeatherTarget } from '../weather-provider';
import type { OpenWeatherClient } from './client';
import { parseOneCall, parseReverseGeocode, parseSearchResults } from './mappers';

export interface OpenWeatherProviderOptions {
  /** Current time in epoch seconds; injectable for deterministic tests. */
  now?: () => number;
}

const defaultNow = () => Math.floor(Date.now() / 1000);

export class OpenWeatherProvider implements WeatherProvider {
  private readonly client: OpenWeatherClient;
  private readonly now: () => number;

  constructor(client: OpenWeatherClient, options: OpenWeatherProviderOptions = {}) {
    this.client = client;
    this.now = options.now ?? defaultNow;
  }

  async getWeather(place: WeatherTarget, options?: RequestOptions): Promise<WeatherSnapshot> {
    const json = await this.client.getJson(
      '/data/3.0/onecall',
      {
        // Coarse coordinates are enough for weather and limit what leaves the device.
        lat: roundCoordinate(place.lat),
        lon: roundCoordinate(place.lon),
        units: 'metric',
        exclude: 'minutely',
        lang: languageOf(options?.locale),
      },
      options,
    );
    return parseOneCall(json, {
      placeId: place.id,
      fetchedAt: this.now(),
      locale: options?.locale,
    });
  }

  async searchPlaces(query: string, options?: RequestOptions): Promise<Place[]> {
    const text = query.trim();
    if (text === '') return [];
    const json = await this.client.getJson('/geo/1.0/direct', { q: text, limit: 5 }, options);
    return parseSearchResults(json, options?.locale);
  }

  async reverseGeocode(lat: number, lon: number, options?: RequestOptions): Promise<Place | null> {
    const json = await this.client.getJson(
      '/geo/1.0/reverse',
      { lat: roundCoordinate(lat), lon: roundCoordinate(lon), limit: 1 },
      options,
    );
    return parseReverseGeocode(json, { lat, lon }, options?.locale);
  }
}
