import { createOpenWeatherClient } from '@/providers/openweather/client';
import { OpenWeatherProvider } from '@/providers/openweather';
import { ProviderError } from '@/providers/weather-provider';

export const TEST_API_KEY = 'SECRET-KEY-123';

export type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

export function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** A provider wired to a mocked fetch, with no retry delay and a fixed clock. */
export function makeProviderWithFetch(fetchImpl: FetchMock, now = 1_792_498_900) {
  const client = createOpenWeatherClient({
    baseUrl: 'https://api.example.test',
    apiKey: TEST_API_KEY,
    timeoutMs: 1000,
    retryDelayMs: 0,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
  return new OpenWeatherProvider(client, { now: () => now });
}

/** Resolves to the ProviderError kind a promise rejects with, or "resolved". */
export async function errorKindOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error instanceof ProviderError ? error.kind : error;
  }
  return 'resolved';
}
