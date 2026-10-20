import type { Place, WeatherSnapshot } from '@/domain/types';

import {
  ProviderError,
  type RequestOptions,
  type WeatherProvider,
  type WeatherTarget,
} from '../weather-provider';
import { cityToPlace, FAKE_CITIES, findCityForPlace } from './cities';
import { buildSnapshot, isErrorScenario, type FakeScenario } from './scenarios';

export interface FakeProviderOptions {
  scenario?: FakeScenario;
  /** Epoch seconds; defaults to the real clock. Inject for deterministic tests. */
  now?: () => number;
  /** Simulated network latency in milliseconds. */
  latencyMs?: number;
}

const SEARCH_LIMIT = 5;
const REVERSE_GEOCODE_MAX_DISTANCE_DEG = 5;

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

/** In-memory WeatherProvider with switchable scenarios. Never touches the network. */
export class FakeWeatherProvider implements WeatherProvider {
  readonly calls = { getWeather: 0, searchPlaces: 0, reverseGeocode: 0 };

  private scenario: FakeScenario;
  private readonly now: () => number;
  private readonly latencyMs: number;

  constructor(options: FakeProviderOptions = {}) {
    this.scenario = options.scenario ?? 'clear-day';
    this.now = options.now ?? (() => Math.floor(Date.now() / 1000));
    this.latencyMs = options.latencyMs ?? 0;
  }

  setScenario(scenario: FakeScenario): void {
    this.scenario = scenario;
  }

  getScenario(): FakeScenario {
    return this.scenario;
  }

  async getWeather(place: WeatherTarget, options?: RequestOptions): Promise<WeatherSnapshot> {
    this.calls.getWeather++;
    await this.delay(options?.signal);
    if (isErrorScenario(this.scenario)) throw new ProviderError(this.scenario);
    const city = findCityForPlace(place);
    return buildSnapshot(this.scenario, {
      placeId: place.id,
      timeZone: city?.timeZone ?? 'UTC',
      now: this.now(),
    });
  }

  async searchPlaces(query: string, options?: RequestOptions): Promise<Place[]> {
    this.calls.searchPlaces++;
    const text = query.trim().toLowerCase();
    if (text === '') return [];
    await this.delay(options?.signal);
    if (isErrorScenario(this.scenario)) throw new ProviderError(this.scenario);
    return FAKE_CITIES.filter(
      (city) =>
        city.name.toLowerCase().includes(text) ||
        city.aliases?.some((alias) => alias.includes(text)),
    )
      .slice(0, SEARCH_LIMIT)
      .map((city) => cityToPlace(city));
  }

  async reverseGeocode(lat: number, lon: number, options?: RequestOptions): Promise<Place | null> {
    this.calls.reverseGeocode++;
    await this.delay(options?.signal);
    if (isErrorScenario(this.scenario)) throw new ProviderError(this.scenario);
    const nearest = FAKE_CITIES.map((city) => ({
      city,
      distance: Math.hypot(city.lat - lat, city.lon - lon),
    })).sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > REVERSE_GEOCODE_MAX_DISTANCE_DEG) return null;
    return {
      ...cityToPlace(nearest.city, 'current-location'),
      // Keep the coordinates the caller asked about, as the real adapter would.
      lat,
      lon,
      id: 'current',
    };
  }

  private async delay(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw abortError();
    if (this.latencyMs <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, this.latencyMs);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(abortError());
        },
        { once: true },
      );
    });
  }
}
