import { createHttpClient, type HttpClient, type HttpClientOptions } from '../http-client';

export type { QueryParams } from '../http-client';

export interface OpenWeatherClientOptions extends Omit<HttpClientOptions, 'defaultParams'> {
  apiKey: string;
}

export type OpenWeatherClient = HttpClient;

/** The shared HTTP client, with the OpenWeather API key added to every request as `appid`. */
export function createOpenWeatherClient(options: OpenWeatherClientOptions): OpenWeatherClient {
  const { apiKey, ...rest } = options;
  return createHttpClient({ ...rest, defaultParams: { appid: apiKey } });
}
