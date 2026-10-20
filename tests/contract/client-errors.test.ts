import { createOpenWeatherClient } from '@/providers/openweather/client';
import { OpenWeatherProvider } from '@/providers/openweather';
import { ProviderError } from '@/providers/weather-provider';

import clearDay from './fixtures/onecall-clear-day.json';

const KEY = 'SECRET-KEY-123';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function brokenBodyResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    },
  } as unknown as Response;
}

/** A fetch that only settles when its AbortSignal fires, like a hung connection. */
function hangingFetch(): FetchMock {
  return jest.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
  });
}

function makeClient(fetchImpl: FetchMock, overrides: { timeoutMs?: number } = {}) {
  return createOpenWeatherClient({
    baseUrl: 'https://api.example.test',
    apiKey: KEY,
    timeoutMs: overrides.timeoutMs ?? 1000,
    retryDelayMs: 0,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });
}

async function kindOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error instanceof ProviderError ? error.kind : error;
  }
  return 'resolved';
}

describe('error classification', () => {
  it('maps a failed network request to offline', async () => {
    const fetchImpl: FetchMock = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed'));
    expect(await kindOf(makeClient(fetchImpl).getJson('/x', {}))).toBe('offline');
  });

  it('maps no response within the timeout to timeout', async () => {
    const fetchImpl = hangingFetch();
    expect(await kindOf(makeClient(fetchImpl, { timeoutMs: 20 }).getJson('/x', {}))).toBe(
      'timeout',
    );
  });

  it.each([
    [401, 'unauthorized'],
    [403, 'unauthorized'],
    [404, 'not-found'],
    [429, 'rate-limited'],
    [500, 'server-error'],
    [502, 'server-error'],
    [503, 'server-error'],
    [400, 'server-error'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(jsonResponse(status, {}));
    expect(await kindOf(makeClient(fetchImpl).getJson('/x', {}))).toBe(kind);
  });

  it('maps a 2xx response with an unparseable body to malformed-response', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(brokenBodyResponse());
    expect(await kindOf(makeClient(fetchImpl).getJson('/x', {}))).toBe('malformed-response');
  });

  it('never lets a raw error escape for unexpected failures', async () => {
    const fetchImpl: FetchMock = jest.fn().mockRejectedValue(new Error('something odd'));
    const result = await kindOf(makeClient(fetchImpl).getJson('/x', {}));
    expect(['offline', 'server-error']).toContain(result);
  });
});

describe('retry policy', () => {
  it('retries a server error once and succeeds', async () => {
    const fetchImpl: FetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, {}))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    await expect(makeClient(fetchImpl).getJson('/x', {})).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after a single retry on repeated server errors', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(jsonResponse(503, {}));
    expect(await kindOf(makeClient(fetchImpl).getJson('/x', {}))).toBe('server-error');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries a timeout once', async () => {
    const fetchImpl: FetchMock = jest
      .fn()
      .mockImplementationOnce(hangingFetch())
      .mockResolvedValueOnce(jsonResponse(200, { ok: 1 }));
    await expect(makeClient(fetchImpl, { timeoutMs: 20 }).getJson('/x', {})).resolves.toEqual({
      ok: 1,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([401, 404, 429])('does not retry HTTP %i', async (status) => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(jsonResponse(status, {}));
    await kindOf(makeClient(fetchImpl).getJson('/x', {}));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry when offline', async () => {
    const fetchImpl: FetchMock = jest
      .fn()
      .mockRejectedValue(new TypeError('Network request failed'));
    await kindOf(makeClient(fetchImpl).getJson('/x', {}));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('abort handling', () => {
  it('rejects promptly with an AbortError when the caller aborts, without retrying', async () => {
    const fetchImpl = hangingFetch();
    const controller = new AbortController();
    const promise = makeClient(fetchImpl, { timeoutMs: 5000 }).getJson(
      '/x',
      {},
      {
        signal: controller.signal,
      },
    );
    controller.abort();
    const error = await promise.catch((e: unknown) => e);
    expect((error as Error).name).toBe('AbortError');
    expect(error).not.toBeInstanceOf(ProviderError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const fetchImpl: FetchMock = jest.fn();
    const controller = new AbortController();
    controller.abort();
    const error = await makeClient(fetchImpl)
      .getJson('/x', {}, { signal: controller.signal })
      .catch((e: unknown) => e);
    expect((error as Error).name).toBe('AbortError');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('request construction', () => {
  it('sends the path, params and appid as query parameters', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(jsonResponse(200, {}));
    await makeClient(fetchImpl).getJson('/geo/1.0/direct', { q: 'Paris', limit: 5 });
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.origin).toBe('https://api.example.test');
    expect(url.pathname).toBe('/geo/1.0/direct');
    expect(url.searchParams.get('q')).toBe('Paris');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(url.searchParams.get('appid')).toBe(KEY);
  });
});

describe('OpenWeatherProvider.getWeather', () => {
  const makeProvider = (fetchImpl: FetchMock) =>
    new OpenWeatherProvider(makeClient(fetchImpl), { now: () => 1_792_498_900 });

  it('requests metric units, excludes minutely data, and rounds coordinates to 2 decimals', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(jsonResponse(200, clearDay));
    await makeProvider(fetchImpl).getWeather({ id: 'current', lat: 48.85661, lon: 2.35222 });
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.pathname).toBe('/data/3.0/onecall');
    expect(url.searchParams.get('units')).toBe('metric');
    expect(url.searchParams.get('exclude')).toBe('minutely');
    expect(url.searchParams.get('lat')).toBe('48.86');
    expect(url.searchParams.get('lon')).toBe('2.35');
  });

  it('returns a snapshot keyed by the place id with the injected fetch time', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(jsonResponse(200, clearDay));
    const snapshot = await makeProvider(fetchImpl).getWeather({
      id: '48.86,2.35',
      lat: 48.86,
      lon: 2.35,
    });
    expect(snapshot.placeId).toBe('48.86,2.35');
    expect(snapshot.fetchedAt).toBe(1_792_498_900);
    expect(snapshot.hourly).toHaveLength(24);
  });

  it('rejects a structurally invalid 200 response with malformed-response', async () => {
    const fetchImpl: FetchMock = jest.fn().mockResolvedValue(jsonResponse(200, { nope: true }));
    const result = await kindOf(makeProvider(fetchImpl).getWeather({ id: 'x', lat: 1, lon: 2 }));
    expect(result).toBe('malformed-response');
  });
});

describe('logging', () => {
  const spies: jest.SpyInstance[] = [];
  const captured = () => JSON.stringify(spies.flatMap((spy) => spy.mock.calls));

  beforeEach(() => {
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      spies.push(jest.spyOn(console, level).mockImplementation(() => undefined));
    }
  });

  afterEach(() => {
    spies.forEach((spy) => spy.mockRestore());
    spies.length = 0;
  });

  it('never writes the API key or coordinates to logs, even when requests fail', async () => {
    const failures: FetchMock[] = [
      jest.fn().mockRejectedValue(new TypeError('Network request failed for appid=' + KEY)),
      jest.fn().mockResolvedValue(jsonResponse(429, {})),
      jest.fn().mockResolvedValue(jsonResponse(500, {})),
      jest.fn().mockResolvedValue(brokenBodyResponse()),
    ];
    for (const fetchImpl of failures) {
      const provider = new OpenWeatherProvider(makeClient(fetchImpl), { now: () => 1 });
      await kindOf(provider.getWeather({ id: 'current', lat: 48.8566, lon: 2.3522 }));
    }
    const logged = captured();
    expect(logged).not.toContain(KEY);
    expect(logged).not.toContain('48.85');
    expect(logged).not.toContain('2.35');
  });
});
