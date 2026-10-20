import { errorKindOf, jsonResponse, makeProviderWithFetch, type FetchMock } from '../helpers/http';

import direct from './fixtures/geocoding-direct.json';
import empty from './fixtures/geocoding-empty.json';

const respondWith = (status: number, body: unknown): FetchMock =>
  jest.fn().mockResolvedValue(jsonResponse(status, body));

describe('searchPlaces: mapping', () => {
  it('maps results to saved-kind Places with region, country and a coordinate id', async () => {
    const places = await makeProviderWithFetch(respondWith(200, direct)).searchPlaces(
      'Springfield',
    );
    expect(places).toHaveLength(5);
    expect(places[0]).toEqual({
      id: '39.80,-89.64',
      name: 'Springfield',
      region: 'Illinois',
      country: 'US',
      lat: 39.8,
      lon: -89.64,
      timeZone: null,
      kind: 'saved',
      sortOrder: null,
    });
  });

  it('builds ids as "<lat>,<lon>" rounded to 2 decimals', async () => {
    const places = await makeProviderWithFetch(respondWith(200, direct)).searchPlaces(
      'Springfield',
    );
    expect(places.map((place) => place.id)).toEqual([
      '39.80,-89.64',
      '42.10,-72.59',
      '37.21,-93.29',
      '-26.00,28.40',
      '55.75,37.62',
    ]);
  });

  it('keeps same-named places distinguishable by region and country', async () => {
    const places = await makeProviderWithFetch(respondWith(200, direct)).searchPlaces(
      'Springfield',
    );
    const springfields = places.filter((place) => place.name === 'Springfield');
    expect(springfields.map((p) => p.region)).toEqual([
      'Illinois',
      'Massachusetts',
      'Missouri',
      null,
    ]);
    expect(new Set(springfields.map((p) => p.id)).size).toBe(springfields.length);
  });

  it('preserves non-Latin names', async () => {
    const places = await makeProviderWithFetch(respondWith(200, direct)).searchPlaces('Moscow');
    expect(places[4]?.name).toBe('Москва');
  });

  it('resolves an empty array when nothing matches (not an error)', async () => {
    await expect(
      makeProviderWithFetch(respondWith(200, empty)).searchPlaces('zzzzqq'),
    ).resolves.toEqual([]);
  });
});

describe('searchPlaces: request', () => {
  it('requests /geo/1.0/direct with the trimmed query and a limit of 5', async () => {
    const fetchImpl = respondWith(200, direct);
    await makeProviderWithFetch(fetchImpl).searchPlaces('  Springfield  ');
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.pathname).toBe('/geo/1.0/direct');
    expect(url.searchParams.get('q')).toBe('Springfield');
    expect(url.searchParams.get('limit')).toBe('5');
  });

  it('encodes special characters and non-Latin text in the query', async () => {
    const fetchImpl = respondWith(200, direct);
    await makeProviderWithFetch(fetchImpl).searchPlaces('São Paulo, BR & more');
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.searchParams.get('q')).toBe('São Paulo, BR & more');
  });

  it.each(['', '   ', '\n\t'])(
    'resolves [] for blank input %j without any network call',
    async (query) => {
      const fetchImpl = respondWith(200, direct);
      await expect(makeProviderWithFetch(fetchImpl).searchPlaces(query)).resolves.toEqual([]);
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );
});

describe('searchPlaces: invalid data', () => {
  const bad = (overrides: Record<string, unknown>) => [
    { name: 'X', lat: 1, lon: 2, country: 'US', ...overrides },
  ];

  it.each([
    ['latitude above 90', bad({ lat: 91 })],
    ['latitude below -90', bad({ lat: -90.5 })],
    ['longitude above 180', bad({ lon: 180.1 })],
    ['longitude below -180', bad({ lon: -181 })],
    ['an empty name', bad({ name: '' })],
    ['a missing country', bad({ country: undefined })],
    ['an object instead of an array', {}],
    ['null', null],
  ])('rejects %s with malformed-response', async (_label, body) => {
    const provider = makeProviderWithFetch(respondWith(200, body));
    expect(await errorKindOf(provider.searchPlaces('x'))).toBe('malformed-response');
  });

  it('accepts coordinates exactly on the limits', async () => {
    const places = await makeProviderWithFetch(
      respondWith(200, bad({ lat: 90, lon: -180 })),
    ).searchPlaces('x');
    expect(places).toHaveLength(1);
  });

  it('propagates HTTP failures as ProviderError kinds', async () => {
    expect(await errorKindOf(makeProviderWithFetch(respondWith(429, {})).searchPlaces('x'))).toBe(
      'rate-limited',
    );
  });

  it('never writes the query text to the logs when a search fails', async () => {
    const spies = (['debug', 'info', 'warn', 'error'] as const).map((level) =>
      jest.spyOn(console, level).mockImplementation(() => undefined),
    );
    await errorKindOf(
      makeProviderWithFetch(respondWith(500, {})).searchPlaces('Springfield Secret'),
    );
    expect(JSON.stringify(spies.flatMap((spy) => spy.mock.calls))).not.toContain('Springfield');
    spies.forEach((spy) => spy.mockRestore());
  });
});
