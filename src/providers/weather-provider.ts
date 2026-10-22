import type { Place, WeatherSnapshot } from '@/domain/types';

/**
 * The only interface the rest of the app uses to obtain weather data
 * (see specs/001-weather-app/contracts/weather-provider.md).
 */

export type ProviderErrorKind =
  | 'offline'
  | 'timeout'
  | 'rate-limited'
  | 'unauthorized'
  | 'not-found'
  | 'malformed-response'
  | 'server-error';

export const PROVIDER_ERROR_KINDS: readonly ProviderErrorKind[] = [
  'offline',
  'timeout',
  'rate-limited',
  'unauthorized',
  'not-found',
  'malformed-response',
  'server-error',
];

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;

  constructor(kind: ProviderErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'ProviderError';
    this.kind = kind;
  }
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError;
}

export interface RequestOptions {
  signal?: AbortSignal;
  /**
   * BCP 47 tag of the user's locale, e.g. "fr-FR". Condition names and place names come back in
   * its language when the provider has them; English otherwise. Never sent as such: only the
   * language reaches the service.
   */
  locale?: string;
}

export type WeatherTarget = Pick<Place, 'id' | 'lat' | 'lon'>;

export interface WeatherProvider {
  /** Weather for a place. Rejects with ProviderError. */
  getWeather(place: WeatherTarget, options?: RequestOptions): Promise<WeatherSnapshot>;

  /** Search places by free text. Empty array when nothing matches. Rejects with ProviderError. */
  searchPlaces(query: string, options?: RequestOptions): Promise<Place[]>;

  /** Name for coordinates. Resolves null when no name is available. Rejects with ProviderError. */
  reverseGeocode(lat: number, lon: number, options?: RequestOptions): Promise<Place | null>;
}
