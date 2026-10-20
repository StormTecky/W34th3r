import { dayKey, formatHourLabel, utcOffsetSeconds } from '@/domain/time';
import { FakeWeatherProvider } from '@/providers/fake/fake-provider';
import { DATA_SCENARIOS, FAKE_SCENARIOS } from '@/providers/fake/scenarios';
import { PROVIDER_ERROR_KINDS, ProviderError } from '@/providers/weather-provider';

const NOW = 1_792_498_800;
const paris = { id: '48.86,2.35', lat: 48.86, lon: 2.35 };

const make = (scenario?: (typeof FAKE_SCENARIOS)[number]) =>
  new FakeWeatherProvider({ scenario, now: () => NOW });

describe('data scenarios', () => {
  it.each(DATA_SCENARIOS)('%s returns a snapshot that satisfies the data model', async (name) => {
    const snapshot = await make(name).getWeather(paris);
    expect(snapshot.placeId).toBe(paris.id);
    expect(snapshot.fetchedAt).toBe(NOW);
    expect(snapshot.timeZone).toBe('Europe/Paris');
    expect(snapshot.hourly).toHaveLength(24);
    expect(snapshot.daily).toHaveLength(7);
    for (const list of [snapshot.hourly, snapshot.daily]) {
      for (let i = 1; i < list.length; i++)
        expect(list[i]!.start).toBeGreaterThan(list[i - 1]!.start);
    }
    const { current } = snapshot;
    expect(current.humidity).toBeGreaterThanOrEqual(0);
    expect(current.humidity).toBeLessThanOrEqual(100);
    expect(current.high).toBeGreaterThanOrEqual(current.low);
  });

  it('is deterministic for a fixed clock', async () => {
    expect(await make('clear-day').getWeather(paris)).toEqual(
      await make('clear-day').getWeather(paris),
    );
  });

  it('has the expected day/night and condition for the main scenarios', async () => {
    expect((await make('clear-day').getWeather(paris)).current).toMatchObject({
      condition: 'clear',
      isDay: true,
    });
    expect((await make('rain-night').getWeather(paris)).current).toMatchObject({
      condition: 'rain',
      isDay: false,
    });
  });

  it('omits optional fields in the missing-optionals scenario', async () => {
    const { current } = await make('missing-optionals').getWeather(paris);
    for (const key of ['uvIndex', 'visibility', 'windDirection', 'windGust'])
      expect(key in current).toBe(false);
  });

  it('includes alerts only in alerts-active', async () => {
    expect((await make('alerts-active').getWeather(paris)).alerts.length).toBeGreaterThan(0);
    expect((await make('clear-day').getWeather(paris)).alerts).toEqual([]);
  });

  it('maps nearby coordinates to the closest city time zone', async () => {
    const near = await make().getWeather({ id: 'current', lat: 35.6762, lon: 139.6503 });
    expect(near.timeZone).toBe('Asia/Tokyo');
  });

  it('stamps each daily entry with local noon of consecutive local days', async () => {
    const snapshot = await make().getWeather({ id: '35.68,139.69', lat: 35.68, lon: 139.69 });
    snapshot.daily.forEach((day, i) => {
      expect(dayKey(day.start, 'Asia/Tokyo')).toBe(dayKey(NOW + i * 86_400, 'Asia/Tokyo'));
      expect(utcOffsetSeconds(day.start, 'Asia/Tokyo')).toBe(9 * 3600);
      expect(formatHourLabel(day.start, 'Asia/Tokyo')).toBe('12 PM');
    });
  });

  it('uses the place time zone and falls back to UTC for unknown places', async () => {
    const tokyo = await make().getWeather({ id: '35.68,139.69', lat: 35.68, lon: 139.69 });
    expect(tokyo.timeZone).toBe('Asia/Tokyo');
    const nowhere = await make().getWeather({ id: '-60.00,0.00', lat: -60, lon: 0 });
    expect(nowhere.timeZone).toBe('UTC');
  });
});

describe('error scenarios', () => {
  it.each(PROVIDER_ERROR_KINDS)('%s rejects with that ProviderError kind', async (kind) => {
    const provider = make(kind);
    await expect(provider.getWeather(paris)).rejects.toMatchObject({ kind });
    await expect(provider.getWeather(paris)).rejects.toBeInstanceOf(ProviderError);
  });

  it('can switch scenarios at runtime', async () => {
    const provider = make('clear-day');
    await provider.getWeather(paris);
    provider.setScenario('offline');
    await expect(provider.getWeather(paris)).rejects.toMatchObject({ kind: 'offline' });
    expect(provider.getScenario()).toBe('offline');
  });
});

describe('searchPlaces', () => {
  it('finds same-named places across regions', async () => {
    const results = await make().searchPlaces('spring');
    expect(results.map((p) => p.region)).toEqual(['Illinois', 'Massachusetts', 'Missouri']);
    expect(new Set(results.map((p) => p.id)).size).toBe(3);
  });

  it('matches non-Latin names through their aliases', async () => {
    const results = await make().searchPlaces('moscow');
    expect(results[0]?.name).toBe('Москва');
  });

  it('returns [] for blank or unmatched text and counts calls', async () => {
    const provider = make();
    expect(await provider.searchPlaces('   ')).toEqual([]);
    expect(await provider.searchPlaces('zzzzqq')).toEqual([]);
    expect(provider.calls.searchPlaces).toBe(2);
  });

  it('limits results to 5', async () => {
    expect((await make().searchPlaces('i')).length).toBeLessThanOrEqual(5);
  });
});

describe('reverseGeocode', () => {
  it('names the nearest city for the current location', async () => {
    const place = await make().reverseGeocode(48.85, 2.34);
    expect(place).toMatchObject({ id: 'current', name: 'Paris', kind: 'current-location' });
  });

  it('returns null far from every known city', async () => {
    expect(await make().reverseGeocode(-60, 0)).toBeNull();
  });
});

describe('abort and latency', () => {
  it('rejects with an AbortError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(make().getWeather(paris, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('honours aborts during simulated latency', async () => {
    const provider = new FakeWeatherProvider({ now: () => NOW, latencyMs: 10_000 });
    const controller = new AbortController();
    const promise = provider.getWeather(paris, { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
