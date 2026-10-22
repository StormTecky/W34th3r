import { createOpenMeteoProvider } from '@/providers/openmeteo';
import { describeWmo } from '@/providers/openmeteo/codes';
import { parseForecast } from '@/providers/openmeteo/mappers';
import { parseOneCall } from '@/providers/openweather/mappers';

import { jsonResponse, makeProviderWithFetch, type FetchMock } from '../helpers/http';
import reverseOpenWeather from './fixtures/geocoding-reverse.json';
import direct from './fixtures/geocoding-direct.json';
import oneCall from './fixtures/onecall-clear-day.json';
import forecast from './fixtures/openmeteo-forecast-paris.json';
import geocoding from './fixtures/openmeteo-geocoding-search.json';
import bigDataCloud from './fixtures/bigdatacloud-reverse.json';

const CONTEXT = { placeId: '48.86,2.35', fetchedAt: forecast.current.time + 30 };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function respondWith(body: unknown): FetchMock {
  return jest.fn().mockResolvedValue(jsonResponse(200, body));
}

const urlOf = (fetchImpl: FetchMock) => new URL(fetchImpl.mock.calls[0]![0]);

const WMO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86,
  95, 96, 99,
];

describe('WMO condition names in French', () => {
  it.each([
    [0, 'Ciel dégagé'],
    [2, 'Partiellement nuageux'],
    [3, 'Couvert'],
    [45, 'Brouillard'],
    [51, 'Bruine légère'],
    [63, 'Pluie modérée'],
    [66, 'Pluie verglaçante'],
    [75, 'Forte neige'],
    [82, 'Averses violentes'],
    [95, 'Orage'],
    [99, 'Violent orage avec grêle'],
  ])('names code %i "%s"', (code, summary) => {
    expect(describeWmo(code, 'fr-FR')).toBe(summary);
    expect(describeWmo(code, 'fr-CA')).toBe(summary);
  });

  it('translates every code, with a different name from English', () => {
    for (const code of WMO_CODES) {
      expect(describeWmo(code, 'fr')).not.toBe(describeWmo(code, 'en-US'));
      expect(describeWmo(code, 'fr').trim().length).toBeGreaterThan(2);
    }
  });

  it('keeps English as the default and for untranslated languages', () => {
    expect(describeWmo(61)).toBe('Light rain');
    expect(describeWmo(61, 'de-DE')).toBe('Light rain');
  });

  it('says the conditions are unknown in the language of the interface', () => {
    expect(describeWmo(1000, 'fr-FR')).toBe('Conditions inconnues');
    expect(describeWmo(1000)).toBe('Unknown conditions');
  });
});

describe('Open-Meteo forecast in French', () => {
  it('names current, hourly and daily conditions in the locale language', () => {
    const french = parseForecast(forecast, { ...CONTEXT, locale: 'fr-FR' });
    const english = parseForecast(forecast, CONTEXT);
    expect(french.current.summary).toBe(describeWmo(forecast.current.weather_code, 'fr'));
    expect(french.current.summary).not.toBe(english.current.summary);
    expect(french.hourly.map((h) => h.summary)).not.toEqual(english.hourly.map((h) => h.summary));
    expect(french.daily[0]!.summary).toBe(describeWmo(forecast.daily.weather_code[0]!, 'fr'));
  });

  it('changes only the words: categories and numbers stay the same', () => {
    const french = parseForecast(forecast, { ...CONTEXT, locale: 'fr-FR' });
    const english = parseForecast(forecast, CONTEXT);
    const bare = (s: typeof french) =>
      JSON.parse(JSON.stringify(s, (k, v) => (k === 'summary' ? 0 : v)));
    expect(bare(french)).toEqual(bare(english));
  });
});

describe('Open-Meteo requests follow the locale', () => {
  const makeProvider = (fetchImpl: FetchMock) =>
    createOpenMeteoProvider({
      timeoutMs: 1000,
      retryDelayMs: 0,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => CONTEXT.fetchedAt,
    });
  const target = { id: 'current', lat: 48.85661, lon: 2.35222 };

  it('asks for place names in the language of the locale', async () => {
    const fetchImpl = respondWith(geocoding);
    await makeProvider(fetchImpl).searchPlaces('Lyon', { locale: 'fr-CA' });
    expect(urlOf(fetchImpl).searchParams.get('language')).toBe('fr');
  });

  it('asks the reverse geocoder for the locality in the language of the locale', async () => {
    const fetchImpl = respondWith(bigDataCloud);
    await makeProvider(fetchImpl).reverseGeocode(48.85, 2.35, { locale: 'fr-FR' });
    expect(urlOf(fetchImpl).searchParams.get('localityLanguage')).toBe('fr');
  });

  it('describes the weather in the language of the locale', async () => {
    const snapshot = await makeProvider(respondWith(forecast)).getWeather(target, {
      locale: 'fr-FR',
    });
    expect(snapshot.current.summary).toBe(describeWmo(forecast.current.weather_code, 'fr'));
  });

  it('stays in English without a locale or for languages it does not translate', async () => {
    const search = respondWith(geocoding);
    await makeProvider(search).searchPlaces('Lyon');
    expect(urlOf(search).searchParams.get('language')).toBe('en');
    const reverse = respondWith(bigDataCloud);
    await makeProvider(reverse).reverseGeocode(48.85, 2.35, { locale: 'de-DE' });
    expect(urlOf(reverse).searchParams.get('localityLanguage')).toBe('en');
  });

  it('still sends only rounded coordinates and no locale-derived personal data', async () => {
    const fetchImpl = respondWith(forecast);
    await makeProvider(fetchImpl).getWeather(target, { locale: 'fr-FR' });
    const url = urlOf(fetchImpl);
    expect(url.searchParams.get('latitude')).toBe('48.86');
    expect(url.searchParams.has('locale')).toBe(false);
  });
});

describe('OpenWeather in French', () => {
  const context = { placeId: '48.86,2.35', fetchedAt: 1_792_498_900 };

  it('asks One Call for descriptions in the language of the locale', async () => {
    const fetchImpl = respondWith(oneCall);
    await makeProviderWithFetch(fetchImpl).getWeather(
      { id: 'current', lat: 48.85661, lon: 2.35222 },
      { locale: 'fr-FR' },
    );
    expect(urlOf(fetchImpl).searchParams.get('lang')).toBe('fr');
  });

  it('asks for English without a locale', async () => {
    const fetchImpl = respondWith(oneCall);
    await makeProviderWithFetch(fetchImpl).getWeather({ id: 'current', lat: 48.85, lon: 2.35 });
    expect(urlOf(fetchImpl).searchParams.get('lang')).toBe('en');
  });

  it('says the conditions are unknown in the language of the locale', () => {
    const json = clone(oneCall);
    json.current.weather[0]!.description = '   ';
    expect(parseOneCall(json, { ...context, locale: 'fr-FR' }).current.summary).toBe(
      'Conditions inconnues',
    );
    expect(parseOneCall(json, context).current.summary).toBe('Unknown conditions');
  });

  it('shows the local name of a place when OpenWeather has one for the language', async () => {
    const places = await makeProviderWithFetch(respondWith(direct)).searchPlaces('Moscow', {
      locale: 'fr-FR',
    });
    // Only entries that carry a French name change; the rest keep the name they came with.
    expect(places.map((p) => p.name)).toEqual(direct.map((p) => p.name));

    const withFrench = clone(direct);
    (withFrench[4] as { local_names: Record<string, string> }).local_names.fr = 'Moscou';
    const named = await makeProviderWithFetch(respondWith(withFrench)).searchPlaces('Moscou', {
      locale: 'fr-FR',
    });
    expect(named[4]!.name).toBe('Moscou');
    const english = await makeProviderWithFetch(respondWith(withFrench)).searchPlaces('Moscow');
    expect(english[4]!.name).toBe('Москва');
  });

  it('names the device location in French when OpenWeather offers it', async () => {
    const body = clone(reverseOpenWeather);
    body[0]!.local_names.fr = 'Paris (France)';
    const place = await makeProviderWithFetch(respondWith(body)).reverseGeocode(48.85, 2.35, {
      locale: 'fr-FR',
    });
    expect(place?.name).toBe('Paris (France)');
  });

  it('ignores local names that are not text', async () => {
    const body = clone(direct) as Record<string, unknown>[];
    body[0]!.local_names = { fr: 42 };
    const places = await makeProviderWithFetch(respondWith(body)).searchPlaces('Springfield', {
      locale: 'fr-FR',
    });
    expect(places[0]!.name).toBe('Springfield');
  });
});
