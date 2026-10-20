/**
 * Single access point for environment configuration.
 *
 * Expo inlines `process.env.EXPO_PUBLIC_*` only for static property accesses, so the values are
 * listed explicitly below instead of passing `process.env` around.
 */

export interface RawEnv {
  EXPO_PUBLIC_OPENWEATHER_API_KEY?: string;
  EXPO_PUBLIC_WEATHER_PROVIDER?: string;
  EXPO_PUBLIC_USE_FAKE_PROVIDER?: string;
}

export type ProviderId = 'open-meteo' | 'openweather' | 'fake';

export interface AppConfig {
  provider: ProviderId;
  /** Set only for the OpenWeather provider. */
  apiKey: string | null;
  baseUrl: string;
  requestTimeoutMs: number;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org';
const REQUEST_TIMEOUT_MS = 10_000;
const PROVIDERS: readonly ProviderId[] = ['open-meteo', 'openweather', 'fake'];

/**
 * Which provider to use:
 * 1. `EXPO_PUBLIC_WEATHER_PROVIDER` if it names one;
 * 2. the fake provider if the older `EXPO_PUBLIC_USE_FAKE_PROVIDER=1` flag is set;
 * 3. OpenWeather if an API key is present;
 * 4. otherwise Open-Meteo, which needs no key.
 */
function chooseProvider(env: RawEnv, hasKey: boolean): ProviderId {
  const requested = env.EXPO_PUBLIC_WEATHER_PROVIDER?.trim().toLowerCase();
  const named = PROVIDERS.find((id) => id === requested);
  if (named) return named;
  const fake = env.EXPO_PUBLIC_USE_FAKE_PROVIDER?.trim().toLowerCase();
  if (fake === '1' || fake === 'true') return 'fake';
  return hasKey ? 'openweather' : 'open-meteo';
}

export function readConfig(env: RawEnv): AppConfig {
  const apiKey = env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim() ?? '';
  const provider = chooseProvider(env, apiKey.length > 0);

  if (provider === 'openweather' && apiKey.length === 0) {
    throw new ConfigurationError(
      'EXPO_PUBLIC_OPENWEATHER_API_KEY is not set. Add a key to .env.local, or remove ' +
        'EXPO_PUBLIC_WEATHER_PROVIDER=openweather to use the free Open-Meteo provider.',
    );
  }

  return {
    provider,
    apiKey: provider === 'openweather' ? apiKey : null,
    baseUrl: OPENWEATHER_BASE_URL,
    requestTimeoutMs: REQUEST_TIMEOUT_MS,
  };
}

let cached: AppConfig | undefined;

/** Reads the build-time environment once and caches the result. */
export function getConfig(): AppConfig {
  cached ??= readConfig({
    EXPO_PUBLIC_OPENWEATHER_API_KEY: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY,
    EXPO_PUBLIC_WEATHER_PROVIDER: process.env.EXPO_PUBLIC_WEATHER_PROVIDER,
    EXPO_PUBLIC_USE_FAKE_PROVIDER: process.env.EXPO_PUBLIC_USE_FAKE_PROVIDER,
  });
  return cached;
}
