import { errorKindOf, jsonResponse, makeProviderWithFetch, type FetchMock } from '../helpers/http';

import reverse from './fixtures/geocoding-reverse.json';
import reverseEmpty from './fixtures/geocoding-reverse-empty.json';

const respondWith = (status: number, body: unknown): FetchMock =>
  jest.fn().mockResolvedValue(jsonResponse(status, body));

describe('reverseGeocode', () => {
  it('maps the first result to the current-location Place', async () => {
    const provider = makeProviderWithFetch(respondWith(200, reverse));
    await expect(provider.reverseGeocode(48.8566, 2.3522)).resolves.toEqual({
      id: 'current',
      name: 'Paris',
      region: 'Île-de-France',
      country: 'FR',
      lat: 48.86,
      lon: 2.35,
      timeZone: null,
      kind: 'current-location',
      sortOrder: null,
    });
  });

  it('keeps the requested (rounded) coordinates, not the geocoder result coordinates', async () => {
    const provider = makeProviderWithFetch(respondWith(200, reverse));
    const place = await provider.reverseGeocode(48.8566, 2.3522);
    expect(place?.lat).toBe(48.86);
    expect(place?.lon).toBe(2.35);
  });

  it('sets region to null when the result has no state', async () => {
    const body = [{ name: 'Reykjavík', lat: 64.15, lon: -21.94, country: 'IS' }];
    const place = await makeProviderWithFetch(respondWith(200, body)).reverseGeocode(64.15, -21.94);
    expect(place?.region).toBeNull();
  });

  it('resolves null when nothing is found', async () => {
    const provider = makeProviderWithFetch(respondWith(200, reverseEmpty));
    await expect(provider.reverseGeocode(0, 0)).resolves.toBeNull();
  });

  it('requests /geo/1.0/reverse with rounded coordinates and limit 1', async () => {
    const fetchImpl = respondWith(200, reverse);
    await makeProviderWithFetch(fetchImpl).reverseGeocode(48.85661, 2.35222);
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.pathname).toBe('/geo/1.0/reverse');
    expect(url.searchParams.get('lat')).toBe('48.86');
    expect(url.searchParams.get('lon')).toBe('2.35');
    expect(url.searchParams.get('limit')).toBe('1');
  });

  it.each([
    ['an object instead of an array', {}],
    ['a result without a name', [{ lat: 1, lon: 2, country: 'FR' }]],
    ['a result with an empty name', [{ name: '', lat: 1, lon: 2, country: 'FR' }]],
    ['a result without coordinates', [{ name: 'Paris', country: 'FR' }]],
    ['a result without a country', [{ name: 'Paris', lat: 1, lon: 2 }]],
    ['null', null],
  ])('rejects %s with malformed-response', async (_label, body) => {
    const provider = makeProviderWithFetch(respondWith(200, body));
    expect(await errorKindOf(provider.reverseGeocode(1, 2))).toBe('malformed-response');
  });

  it('propagates HTTP failures as ProviderError kinds', async () => {
    const provider = makeProviderWithFetch(respondWith(401, {}));
    expect(await errorKindOf(provider.reverseGeocode(1, 2))).toBe('unauthorized');
  });
});
