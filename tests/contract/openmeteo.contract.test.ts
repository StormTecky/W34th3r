import { categoryFromWmo, describeWmo } from '@/providers/openmeteo/codes';
import { parseForecast } from '@/providers/openmeteo/mappers';
import { createOpenMeteoProvider } from '@/providers/openmeteo';
import { ProviderError } from '@/providers/weather-provider';

import { jsonResponse, type FetchMock } from '../helpers/http';
import forecast from './fixtures/openmeteo-forecast-paris.json';
import geocoding from './fixtures/openmeteo-geocoding-search.json';
import geocodingEmpty from './fixtures/openmeteo-geocoding-empty.json';
import reverse from './fixtures/bigdatacloud-reverse.json';
import reverseOcean from './fixtures/bigdatacloud-reverse-ocean.json';

// forecast fixture: a real recording for Paris. current.time is 2026-10-20 16:30 UTC.
const CONTEXT = { placeId: '48.86,2.35', fetchedAt: forecast.current.time + 30 };
const HOUR = 3600;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const mutable = () => clone(forecast) as any;

function malformedKind(json: unknown): unknown {
  try {
    parseForecast(json, CONTEXT);
  } catch (error) {
    return error instanceof ProviderError ? error.kind : error;
  }
  return 'no error thrown';
}

describe('WMO weather codes', () => {
  it.each([
    [0, 'clear', 'Clear sky'],
    [1, 'clear', 'Mainly clear'],
    [2, 'partly-cloudy', 'Partly cloudy'],
    [3, 'cloudy', 'Overcast'],
    [45, 'mist-fog', 'Fog'],
    [48, 'mist-fog', 'Rime fog'],
    [51, 'drizzle', 'Light drizzle'],
    [55, 'drizzle', 'Heavy drizzle'],
    [56, 'sleet', 'Freezing drizzle'],
    [61, 'rain', 'Light rain'],
    [63, 'rain', 'Moderate rain'],
    [65, 'rain', 'Heavy rain'],
    [66, 'sleet', 'Freezing rain'],
    [71, 'snow', 'Light snow'],
    [75, 'snow', 'Heavy snow'],
    [77, 'snow', 'Snow grains'],
    [80, 'rain', 'Light showers'],
    [82, 'rain', 'Violent showers'],
    [85, 'snow', 'Light snow showers'],
    [95, 'thunderstorm', 'Thunderstorm'],
    [96, 'thunderstorm', 'Thunderstorm with hail'],
    [99, 'thunderstorm', 'Severe thunderstorm with hail'],
  ])('maps code %i to %s ("%s")', (code, category, summary) => {
    expect(categoryFromWmo(code)).toBe(category);
    expect(describeWmo(code)).toBe(summary);
  });

  it.each([-1, 4, 44, 100, 1000, NaN])('treats unknown code %p as unknown', (code) => {
    expect(categoryFromWmo(code)).toBe('unknown');
    expect(describeWmo(code)).toBe('Unknown conditions');
  });
});

describe('forecast mapping (real recorded response)', () => {
  const snapshot = parseForecast(forecast, CONTEXT);
  const startIndex = forecast.hourly.time.findIndex(
    (t) => t >= forecast.current.time - (forecast.current.time % HOUR),
  );

  it('carries identity and time zone information', () => {
    expect(snapshot.placeId).toBe('48.86,2.35');
    expect(snapshot.fetchedAt).toBe(CONTEXT.fetchedAt);
    expect(snapshot.timeZone).toBe('Europe/Paris');
    expect(snapshot.timeZoneOffset).toBe(7200);
  });

  it('maps current conditions in metric units', () => {
    const { current } = snapshot;
    expect(current.temperature).toBe(forecast.current.temperature_2m);
    expect(current.feelsLike).toBe(forecast.current.apparent_temperature);
    expect(current.humidity).toBe(forecast.current.relative_humidity_2m);
    expect(current.pressure).toBe(forecast.current.pressure_msl);
    expect(current.windSpeed).toBe(forecast.current.wind_speed_10m);
    expect(current.windDirection).toBe(forecast.current.wind_direction_10m);
    expect(current.windGust).toBe(forecast.current.wind_gusts_10m);
    expect(current.observedAt).toBe(forecast.current.time);
    expect(current.condition).toBe(categoryFromWmo(forecast.current.weather_code));
    expect(current.summary).toBe(describeWmo(forecast.current.weather_code));
    expect(current.isDay).toBe(forecast.current.is_day === 1);
  });

  it("takes today's sun times, high and low from the first daily entry", () => {
    expect(snapshot.current.sunrise).toBe(forecast.daily.sunrise[0]);
    expect(snapshot.current.sunset).toBe(forecast.daily.sunset[0]);
    expect(snapshot.current.high).toBe(forecast.daily.temperature_2m_max[0]);
    expect(snapshot.current.low).toBe(forecast.daily.temperature_2m_min[0]);
  });

  it('reads UV index and visibility from the hour containing "now"', () => {
    expect(snapshot.current.uvIndex).toBe(forecast.hourly.uv_index[startIndex]);
    expect(snapshot.current.visibility).toBe(forecast.hourly.visibility[startIndex]);
  });

  it('starts the 24 hourly entries at the current hour, strictly ascending', () => {
    expect(snapshot.hourly).toHaveLength(24);
    expect(snapshot.hourly[0]!.start).toBe(forecast.hourly.time[startIndex]);
    expect(snapshot.hourly[0]!.start).toBeLessThanOrEqual(forecast.current.time);
    for (let i = 1; i < snapshot.hourly.length; i++) {
      expect(snapshot.hourly[i]!.start).toBe(snapshot.hourly[i - 1]!.start + HOUR);
    }
    expect(snapshot.hourly[0]).toMatchObject({
      kind: 'hour',
      temperature: forecast.hourly.temperature_2m[startIndex],
      condition: categoryFromWmo(forecast.hourly.weather_code[startIndex]!),
    });
  });

  it('maps seven days, each stamped with local noon of its calendar day', () => {
    expect(snapshot.daily).toHaveLength(7);
    snapshot.daily.forEach((day, i) => {
      expect(day.kind).toBe('day');
      expect(day.start).toBe(forecast.daily.time[i]! + 12 * HOUR);
      expect(day.high).toBe(forecast.daily.temperature_2m_max[i]);
      expect(day.low).toBe(forecast.daily.temperature_2m_min[i]);
      expect(day.precipChance).toBe(forecast.daily.precipitation_probability_max[i]);
    });
  });

  it('keeps precipitation chances as integers from 0 to 100', () => {
    for (const entry of [...snapshot.hourly, ...snapshot.daily]) {
      expect(Number.isInteger(entry.precipChance)).toBe(true);
      expect(entry.precipChance).toBeGreaterThanOrEqual(0);
      expect(entry.precipChance).toBeLessThanOrEqual(100);
    }
  });

  it('has no alerts, because Open-Meteo provides none', () => {
    expect(snapshot.alerts).toEqual([]);
  });
});

describe('forecast mapping: edge cases', () => {
  it('leaves optional values absent when the provider omits them', () => {
    const json = mutable();
    for (const key of ['wind_direction_10m', 'wind_gusts_10m']) delete json.current[key];
    for (const key of ['uv_index', 'visibility', 'precipitation_probability'])
      delete json.hourly[key];
    delete json.daily.precipitation_probability_max;
    const { current, hourly, daily } = parseForecast(json, CONTEXT);
    for (const key of ['windDirection', 'windGust', 'uvIndex', 'visibility']) {
      expect(key in current).toBe(false);
    }
    expect(hourly.every((h) => h.precipChance === 0)).toBe(true);
    expect(daily.every((d) => d.precipChance === 0)).toBe(true);
  });

  it('treats null values like missing ones', () => {
    const json = mutable();
    json.current.wind_gusts_10m = null;
    json.current.wind_direction_10m = null;
    const startIndex = json.hourly.time.findIndex(
      (t: number) => t >= json.current.time - (json.current.time % HOUR),
    );
    json.hourly.uv_index[startIndex] = null;
    json.hourly.visibility[startIndex] = null;
    json.hourly.precipitation_probability[startIndex] = null;
    const { current, hourly } = parseForecast(json, CONTEXT);
    expect('windGust' in current).toBe(false);
    expect('windDirection' in current).toBe(false);
    expect('uvIndex' in current).toBe(false);
    expect('visibility' in current).toBe(false);
    expect(hourly[0]!.precipChance).toBe(0);
  });

  it('keeps zero visibility and zero UV as real data', () => {
    const json = mutable();
    const startIndex = json.hourly.time.findIndex(
      (t: number) => t >= json.current.time - (json.current.time % HOUR),
    );
    json.hourly.visibility[startIndex] = 0;
    json.hourly.uv_index[startIndex] = 0;
    const { current } = parseForecast(json, CONTEXT);
    expect(current.visibility).toBe(0);
    expect(current.uvIndex).toBe(0);
  });

  it('skips hours with no temperature or weather code and still fills 24 entries', () => {
    const json = mutable();
    const startIndex = json.hourly.time.findIndex(
      (t: number) => t >= json.current.time - (json.current.time % HOUR),
    );
    json.hourly.temperature_2m[startIndex + 2] = null;
    json.hourly.weather_code[startIndex + 5] = null;
    const { hourly } = parseForecast(json, CONTEXT);
    expect(hourly).toHaveLength(24);
    expect(hourly.map((h) => h.start)).not.toContain(json.hourly.time[startIndex + 2]);
    expect(hourly.map((h) => h.start)).not.toContain(json.hourly.time[startIndex + 5]);
  });

  it('shows night when is_day is 0', () => {
    const json = mutable();
    json.current.is_day = 0;
    expect(parseForecast(json, CONTEXT).current.isDay).toBe(false);
  });

  it('uses 0 for sun times that the provider leaves null (polar regions)', () => {
    const json = mutable();
    json.daily.sunrise[0] = null;
    json.daily.sunset[0] = null;
    const { current } = parseForecast(json, CONTEXT);
    expect(current.sunrise).toBe(0);
    expect(current.sunset).toBe(0);
  });

  it('keeps extreme values', () => {
    const json = mutable();
    json.current.temperature_2m = -40;
    json.current.relative_humidity_2m = 100;
    json.current.wind_speed_10m = 70;
    expect(parseForecast(json, CONTEXT).current).toMatchObject({
      temperature: -40,
      humidity: 100,
      windSpeed: 70,
    });
  });

  it('clamps humidity and precipitation chance into range', () => {
    const json = mutable();
    json.current.relative_humidity_2m = 130;
    const startIndex = json.hourly.time.findIndex(
      (t: number) => t >= json.current.time - (json.current.time % HOUR),
    );
    json.hourly.precipitation_probability[startIndex] = 140;
    const { current, hourly } = parseForecast(json, CONTEXT);
    expect(current.humidity).toBe(100);
    expect(hourly[0]!.precipChance).toBe(100);
  });

  it('wraps wind direction into 0-359', () => {
    const json = mutable();
    json.current.wind_direction_10m = 360;
    expect(parseForecast(json, CONTEXT).current.windDirection).toBe(0);
  });
});

describe('forecast mapping: malformed responses', () => {
  it('rejects a response missing a required current field', () => {
    const json = mutable();
    delete json.current.temperature_2m;
    expect(malformedKind(json)).toBe('malformed-response');
  });

  it.each([
    [
      'empty hourly arrays',
      (j: any) => {
        for (const k of Object.keys(j.hourly)) j.hourly[k] = [];
      },
    ],
    [
      'empty daily arrays',
      (j: any) => {
        for (const k of Object.keys(j.daily)) j.daily[k] = [];
      },
    ],
    [
      'hours that all lie before now',
      (j: any) => {
        j.current.time += 30 * 24 * HOUR;
      },
    ],
    [
      'no timezone',
      (j: any) => {
        delete j.timezone;
      },
    ],
  ])('rejects %s', (_label, change) => {
    const json = mutable();
    change(json);
    expect(malformedKind(json)).toBe('malformed-response');
  });

  it.each([null, undefined, 42, 'text', [], {}])('rejects non-forecast body %p', (body) => {
    expect(malformedKind(body)).toBe('malformed-response');
  });

  it('does not put field values in the error message', () => {
    const json = mutable();
    json.current.temperature_2m = 'secret-looking text';
    try {
      parseForecast(json, CONTEXT);
    } catch (error) {
      expect((error as Error).message).not.toContain('secret-looking');
    }
  });
});

// ---- the provider, over a mocked network ----

function routedFetch(routes: Record<string, unknown | (() => Response)>): FetchMock {
  return jest.fn(async (url: string) => {
    const host = new URL(url).host;
    const route = routes[host];
    if (typeof route === 'function') return (route as () => Response)();
    return jsonResponse(200, route ?? {});
  });
}

const makeProvider = (fetchImpl: FetchMock) =>
  createOpenMeteoProvider({
    timeoutMs: 1000,
    retryDelayMs: 0,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    now: () => CONTEXT.fetchedAt,
  });

async function kindOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error instanceof ProviderError ? error.kind : error;
  }
  return 'resolved';
}

describe('OpenMeteoProvider.getWeather', () => {
  const target = { id: 'current', lat: 48.85661, lon: 2.35222 };

  it('requests the forecast with rounded coordinates, metric units and unix times, and no API key', async () => {
    const fetchImpl = routedFetch({ 'api.open-meteo.com': forecast });
    await makeProvider(fetchImpl).getWeather(target);
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.origin).toBe('https://api.open-meteo.com');
    expect(url.pathname).toBe('/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('48.86');
    expect(url.searchParams.get('longitude')).toBe('2.35');
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
    expect(url.searchParams.get('timeformat')).toBe('unixtime');
    expect(url.searchParams.get('forecast_days')).toBe('8');
    expect(url.searchParams.get('current')).toContain('apparent_temperature');
    expect(url.searchParams.get('hourly')).toContain('uv_index');
    expect(url.searchParams.get('daily')).toContain('sunrise');
    expect(url.searchParams.has('appid')).toBe(false);
    expect(url.searchParams.has('apikey')).toBe(false);
  });

  it('returns a snapshot keyed by the place id with the injected fetch time', async () => {
    const snapshot = await makeProvider(routedFetch({ 'api.open-meteo.com': forecast })).getWeather(
      {
        id: '48.86,2.35',
        lat: 48.86,
        lon: 2.35,
      },
    );
    expect(snapshot.placeId).toBe('48.86,2.35');
    expect(snapshot.fetchedAt).toBe(CONTEXT.fetchedAt);
    expect(snapshot.hourly).toHaveLength(24);
  });

  it.each([
    [429, 'rate-limited'],
    [400, 'server-error'],
    [500, 'server-error'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    const fetchImpl = routedFetch({
      'api.open-meteo.com': () => jsonResponse(status, { error: true, reason: 'nope' }),
    });
    expect(await kindOf(makeProvider(fetchImpl).getWeather(target))).toBe(kind);
  });

  it('rejects a structurally invalid 200 with malformed-response', async () => {
    const fetchImpl = routedFetch({ 'api.open-meteo.com': { nope: true } });
    expect(await kindOf(makeProvider(fetchImpl).getWeather(target))).toBe('malformed-response');
  });

  it('never logs coordinates', async () => {
    const spies = (['debug', 'info', 'warn', 'error'] as const).map((l) =>
      jest.spyOn(console, l).mockImplementation(() => undefined),
    );
    const fetchImpl = routedFetch({ 'api.open-meteo.com': () => jsonResponse(500, {}) });
    await kindOf(makeProvider(fetchImpl).getWeather(target));
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain('48.85');
    expect(logged).not.toContain('2.35');
    spies.forEach((spy) => spy.mockRestore());
  });
});

describe('OpenMeteoProvider.searchPlaces', () => {
  it('maps real search results to saved-kind places with region, country and time zone', async () => {
    const places = await makeProvider(
      routedFetch({ 'geocoding-api.open-meteo.com': geocoding }),
    ).searchPlaces('Springfield');
    expect(places).toHaveLength(5);
    expect(places[0]).toMatchObject({
      name: 'Springfield',
      region: 'Missouri',
      country: 'US',
      kind: 'saved',
      sortOrder: null,
      timeZone: 'America/Chicago',
    });
    expect(places.map((p) => p.region)).toEqual([
      'Missouri',
      'Illinois',
      'Massachusetts',
      'Ohio',
      'Tennessee',
    ]);
    expect(new Set(places.map((p) => p.id)).size).toBe(5);
    expect(places[0]!.id).toMatch(/^-?\d+\.\d{2},-?\d+\.\d{2}$/);
  });

  it('requests the geocoding endpoint with the trimmed query and a limit of 5', async () => {
    const fetchImpl = routedFetch({ 'geocoding-api.open-meteo.com': geocoding });
    await makeProvider(fetchImpl).searchPlaces('  São Paulo  ');
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.pathname).toBe('/v1/search');
    expect(url.searchParams.get('name')).toBe('São Paulo');
    expect(url.searchParams.get('count')).toBe('5');
    expect(url.searchParams.get('language')).toBe('en');
  });

  it('resolves [] when nothing matches (the response then has no results key)', async () => {
    const places = await makeProvider(
      routedFetch({ 'geocoding-api.open-meteo.com': geocodingEmpty }),
    ).searchPlaces('zzzzqqxx');
    expect(places).toEqual([]);
  });

  it.each(['', '   ', '\n'])('resolves [] for blank input %j without a request', async (query) => {
    const fetchImpl = routedFetch({});
    await expect(makeProvider(fetchImpl).searchPlaces(query)).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('falls back to the country name when there is no country code, and to null region/zone', async () => {
    const body = { results: [{ name: 'Nowhere', latitude: 1, longitude: 2, country: 'Atlantis' }] };
    const [place] = await makeProvider(
      routedFetch({ 'geocoding-api.open-meteo.com': body }),
    ).searchPlaces('x');
    expect(place).toMatchObject({ country: 'Atlantis', region: null, timeZone: null });
  });

  it.each([
    ['latitude above 90', { name: 'X', latitude: 91, longitude: 0, country_code: 'US' }],
    ['longitude below -180', { name: 'X', latitude: 0, longitude: -181, country_code: 'US' }],
    ['an empty name', { name: '', latitude: 0, longitude: 0, country_code: 'US' }],
  ])('rejects %s with malformed-response', async (_label, item) => {
    const provider = makeProvider(
      routedFetch({ 'geocoding-api.open-meteo.com': { results: [item] } }),
    );
    expect(await kindOf(provider.searchPlaces('x'))).toBe('malformed-response');
  });

  it('never logs the search text when a search fails', async () => {
    const spies = (['debug', 'info', 'warn', 'error'] as const).map((l) =>
      jest.spyOn(console, l).mockImplementation(() => undefined),
    );
    const fetchImpl = routedFetch({ 'geocoding-api.open-meteo.com': () => jsonResponse(500, {}) });
    await kindOf(makeProvider(fetchImpl).searchPlaces('Springfield Secret'));
    expect(JSON.stringify(spies.flatMap((spy) => spy.mock.calls))).not.toContain('Springfield');
    spies.forEach((spy) => spy.mockRestore());
  });
});

describe('OpenMeteoProvider.reverseGeocode', () => {
  it('names the device location and keeps the requested rounded coordinates', async () => {
    const place = await makeProvider(routedFetch({ 'api-bdc.io': reverse })).reverseGeocode(
      39.7991,
      -89.6439,
    );
    expect(place).toEqual({
      id: 'current',
      name: 'Springfield',
      region: 'Illinois',
      country: 'US',
      lat: 39.8,
      lon: -89.64,
      timeZone: null,
      kind: 'current-location',
      sortOrder: null,
    });
  });

  it('requests rounded coordinates', async () => {
    const fetchImpl = routedFetch({ 'api-bdc.io': reverse });
    await makeProvider(fetchImpl).reverseGeocode(39.79911, -89.64399);
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.pathname).toBe('/data/reverse-geocode-client');
    expect(url.searchParams.get('latitude')).toBe('39.8');
    expect(url.searchParams.get('longitude')).toBe('-89.64');
  });

  it('falls back to the locality when there is no city (open ocean, remote land)', async () => {
    const place = await makeProvider(routedFetch({ 'api-bdc.io': reverseOcean })).reverseGeocode(
      -60,
      0,
    );
    expect(place?.name).toBe(reverseOcean.locality);
    expect(place?.region).toBeNull();
    expect(place?.country).toBe('AQ');
  });

  it('resolves null when the service has no name at all', async () => {
    const empty = {
      city: '',
      locality: '',
      principalSubdivision: '',
      countryCode: '',
      countryName: '',
    };
    await expect(
      makeProvider(routedFetch({ 'api-bdc.io': empty })).reverseGeocode(0, 0),
    ).resolves.toBeNull();
  });

  it('omits the region when it just repeats the name', async () => {
    const body = { city: 'Singapore', principalSubdivision: 'Singapore', countryCode: 'SG' };
    const place = await makeProvider(routedFetch({ 'api-bdc.io': body })).reverseGeocode(
      1.35,
      103.82,
    );
    expect(place?.region).toBeNull();
  });

  it('rejects a body that is not an object with malformed-response', async () => {
    expect(await kindOf(makeProvider(routedFetch({ 'api-bdc.io': [] })).reverseGeocode(1, 2))).toBe(
      'malformed-response',
    );
    expect(
      await kindOf(makeProvider(routedFetch({ 'api-bdc.io': 'text' })).reverseGeocode(1, 2)),
    ).toBe('malformed-response');
  });
});
