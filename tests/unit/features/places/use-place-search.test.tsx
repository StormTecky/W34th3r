import { act, waitFor } from '@testing-library/react-native';

import { usePlaceSearch } from '@/features/places/use-place-search';
import { FakeWeatherProvider } from '@/providers/fake/fake-provider';
import type { WeatherProvider } from '@/providers/weather-provider';

import { renderHookWithProviders } from '../../../helpers/render';

const DEBOUNCE_MS = 300;

beforeEach(() => {
  jest.useFakeTimers();
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

async function setup(initial = '', options: Parameters<typeof renderHookWithProviders>[1] = {}) {
  const view = await renderHookWithProviders(
    ({ text }: { text: string }) => usePlaceSearch(text),
    options,
    { text: initial },
  );
  const type = async (text: string) => view.rerender({ text });
  return { ...view, type };
}

describe('debouncing', () => {
  it('searches once, with the latest text, after typing pauses for 300 ms', async () => {
    const { type, fake, result } = await setup();
    await type('sp');
    await advance(100);
    await type('spr');
    await advance(100);
    await type('spring');
    expect(fake.calls.searchPlaces).toBe(0);
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.results.length).toBeGreaterThan(0));
    expect(fake.calls.searchPlaces).toBe(1);
    expect(result.current.query).toBe('spring');
  });

  it('does not search for blank input and reports that nothing has been searched', async () => {
    const { type, fake, result } = await setup();
    await type('   ');
    await advance(DEBOUNCE_MS * 2);
    expect(fake.calls.searchPlaces).toBe(0);
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
    expect(result.current.isSearching).toBe(false);
  });

  it('trims the query but keeps its case', async () => {
    const { type, result } = await setup();
    await type('  Paris ');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(result.current.query).toBe('Paris');
  });

  it('clears results as soon as the input is cleared', async () => {
    const { type, result } = await setup();
    await type('spring');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.results.length).toBeGreaterThan(0));
    await type('');
    await advance(DEBOUNCE_MS);
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });
});

describe('results', () => {
  it('returns at most 5 places, with same-named places kept distinct', async () => {
    const { type, result } = await setup();
    await type('spring');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.results).toHaveLength(3));
    expect(result.current.results.length).toBeLessThanOrEqual(5);
    expect(new Set(result.current.results.map((p) => p.id)).size).toBe(3);
  });

  it('reports hasSearched with no results for an unmatched query', async () => {
    const { type, result } = await setup();
    await type('zzzzqq');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.hasSearched).toBe(true));
    expect(result.current.results).toEqual([]);
    expect(result.current.errorKind).toBeNull();
  });

  it('shows searching while a request is in flight', async () => {
    // Hold the provider behind a gate so the in-flight state is observable deterministically.
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const inner = new FakeWeatherProvider();
    const provider: WeatherProvider = {
      getWeather: (place, options) => inner.getWeather(place, options),
      reverseGeocode: (lat, lon, options) => inner.reverseGeocode(lat, lon, options),
      searchPlaces: async (query, options) => {
        await gate;
        return inner.searchPlaces(query, options);
      },
    };
    const { type, result } = await setup('', { provider });
    await type('spring');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.isSearching).toBe(true));
    expect(result.current.hasSearched).toBe(false);
    await act(async () => release());
    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(result.current.hasSearched).toBe(true);
  });
});

describe('caching and cancellation', () => {
  it('answers a repeated query from the session cache', async () => {
    const { type, fake, result } = await setup();
    await type('spring');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.results.length).toBeGreaterThan(0));
    await type('tokyo');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.query).toBe('tokyo'));
    await type('spring');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.results.length).toBe(3));
    expect(fake.calls.searchPlaces).toBe(2);
  });

  it('aborts the in-flight request when the query changes', async () => {
    const signals: AbortSignal[] = [];
    const fake = new FakeWeatherProvider();
    const provider: WeatherProvider = {
      getWeather: (p, o) => fake.getWeather(p, o),
      reverseGeocode: (a, b, o) => fake.reverseGeocode(a, b, o),
      searchPlaces: (query, options) => {
        if (options?.signal) signals.push(options.signal);
        return new Promise(() => undefined); // never resolves: stays in flight
      },
    };
    const { type } = await setup('', { provider });
    await type('spring');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(signals).toHaveLength(1));
    await type('tokyo');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
  });
});

describe('failures and privacy', () => {
  it.each(['offline', 'timeout', 'rate-limited', 'server-error'] as const)(
    'surfaces the %s error kind and no results',
    async (kind) => {
      const { type, result } = await setup('', { scenario: kind });
      await type('spring');
      await advance(DEBOUNCE_MS);
      await waitFor(() => expect(result.current.errorKind).toBe(kind));
      expect(result.current.results).toEqual([]);
    },
  );

  it('never logs the search text', async () => {
    const { type, result } = await setup('', { scenario: 'server-error' });
    await type('Springfield Secret');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.errorKind).toBe('server-error'));
    const logged = JSON.stringify(
      (['debug', 'info', 'warn', 'error'] as const).flatMap(
        (level) => (console[level] as jest.Mock).mock.calls,
      ),
    );
    expect(logged).not.toContain('Springfield');
  });

  it('can retry a failed search', async () => {
    const { type, result, fake } = await setup('', { scenario: 'offline' });
    await type('spring');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(result.current.errorKind).toBe('offline'));
    fake.setScenario('clear-day');
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.results.length).toBe(3));
    expect(result.current.errorKind).toBeNull();
  });
});

describe('language', () => {
  it('searches in the language of the device locale and keeps results per language', async () => {
    const searchPlaces = jest.fn(async () => []);
    const provider = { searchPlaces } as unknown as WeatherProvider;
    const { type } = await setup('', { provider, locale: 'fr-FR' });
    await type('lyon');
    await advance(DEBOUNCE_MS);
    await waitFor(() => expect(searchPlaces).toHaveBeenCalledTimes(1));
    expect(searchPlaces).toHaveBeenCalledWith('lyon', expect.objectContaining({ locale: 'fr-FR' }));
  });
});
