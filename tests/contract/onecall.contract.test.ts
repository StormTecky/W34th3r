import { oneCallSchema } from '@/providers/openweather/schemas';
import { parseOneCall } from '@/providers/openweather/mappers';
import { ProviderError } from '@/providers/weather-provider';
import type { WeatherSnapshot } from '@/domain/types';

import clearDay from './fixtures/onecall-clear-day.json';
import rainNight from './fixtures/onecall-rain-night.json';
import withAlerts from './fixtures/onecall-with-alerts.json';
import missingOptionals from './fixtures/onecall-missing-optionals.json';
import extreme from './fixtures/onecall-extreme.json';
import extremeHeat from './fixtures/onecall-extreme-heat.json';
import malformed from './fixtures/onecall-malformed.json';
import emptyArrays from './fixtures/onecall-empty-arrays.json';

const CONTEXT = { placeId: '48.86,2.35', fetchedAt: 1_792_498_900 };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function parse(json: unknown): WeatherSnapshot {
  return parseOneCall(json, CONTEXT);
}

function malformedKind(json: unknown): unknown {
  try {
    parse(json);
  } catch (error) {
    return error instanceof ProviderError ? error.kind : error;
  }
  return 'no error thrown';
}

function collectNumbers(value: unknown, out: number[] = []): number[] {
  if (typeof value === 'number') out.push(value);
  else if (value && typeof value === 'object') {
    Object.values(value).forEach((inner) => collectNumbers(inner, out));
  }
  return out;
}

describe('schema', () => {
  it.each([
    ['clear day', clearDay],
    ['rain night', rainNight],
    ['with alerts', withAlerts],
    ['missing optionals', missingOptionals],
    ['extreme cold', extreme],
    ['extreme heat', extremeHeat],
  ])('accepts the %s fixture', (_name, fixture) => {
    expect(oneCallSchema.safeParse(fixture).success).toBe(true);
  });

  it.each([
    ['malformed (no current.temp)', malformed],
    ['empty hourly/daily arrays', emptyArrays],
  ])('rejects the %s fixture', (_name, fixture) => {
    expect(oneCallSchema.safeParse(fixture).success).toBe(false);
  });

  it('ignores unknown extra fields', () => {
    const json = clone(clearDay) as Record<string, unknown>;
    json.brand_new_field = { anything: true };
    expect(oneCallSchema.safeParse(json).success).toBe(true);
  });
});

describe('mapping a normal response', () => {
  const snapshot = parse(clearDay);

  it('carries identity and time zone information', () => {
    expect(snapshot.placeId).toBe(CONTEXT.placeId);
    expect(snapshot.fetchedAt).toBe(CONTEXT.fetchedAt);
    expect(snapshot.timeZone).toBe('Europe/Paris');
    expect(snapshot.timeZoneOffset).toBe(7200);
  });

  it('maps current conditions in metric units', () => {
    const { current } = snapshot;
    expect(current.temperature).toBe(17.4);
    expect(current.feelsLike).toBe(16.1);
    expect(current.condition).toBe('clear');
    expect(current.summary).toBe('Clear sky');
    expect(current.isDay).toBe(true);
    expect(current.windSpeed).toBe(4.2);
    expect(current.windDirection).toBe(250);
    expect(current.windGust).toBe(7.8);
    expect(current.humidity).toBe(62);
    expect(current.pressure).toBe(1015);
    expect(current.uvIndex).toBe(3.4);
    expect(current.visibility).toBe(10000);
    expect(current.sunrise).toBe(clearDay.current.sunrise);
    expect(current.sunset).toBe(clearDay.current.sunset);
  });

  it("takes today's high and low from daily[0]", () => {
    expect(snapshot.current.high).toBe(clearDay.daily[0]?.temp.max);
    expect(snapshot.current.low).toBe(clearDay.daily[0]?.temp.min);
  });

  it('limits forecasts to 24 hourly and 7 daily entries', () => {
    expect(clearDay.hourly).toHaveLength(48);
    expect(clearDay.daily).toHaveLength(8);
    expect(snapshot.hourly).toHaveLength(24);
    expect(snapshot.daily).toHaveLength(7);
  });

  it('keeps forecast entries strictly ascending by start', () => {
    for (const list of [snapshot.hourly, snapshot.daily]) {
      for (let i = 1; i < list.length; i++) {
        expect(list[i]!.start).toBeGreaterThan(list[i - 1]!.start);
      }
    }
  });

  it('models hourly and daily entries as a discriminated union', () => {
    const hour = snapshot.hourly[0]!;
    const day = snapshot.daily[0]!;
    expect(hour.kind).toBe('hour');
    expect(hour.temperature).toBe(clearDay.hourly[0]?.temp);
    expect('high' in hour).toBe(false);
    expect(day.kind).toBe('day');
    expect(day.high).toBe(clearDay.daily[0]?.temp.max);
    expect(day.low).toBe(clearDay.daily[0]?.temp.min);
    expect('temperature' in day).toBe(false);
  });

  it('converts pop (0-1) to a rounded integer percentage 0-100', () => {
    for (const entry of [...snapshot.hourly, ...snapshot.daily]) {
      expect(Number.isInteger(entry.precipChance)).toBe(true);
      expect(entry.precipChance).toBeGreaterThanOrEqual(0);
      expect(entry.precipChance).toBeLessThanOrEqual(100);
    }
    expect(snapshot.hourly[0]?.precipChance).toBe(Math.round((clearDay.hourly[0]?.pop ?? 0) * 100));
  });

  it('has no alerts when the alerts key is absent', () => {
    expect('alerts' in clearDay).toBe(false);
    expect(snapshot.alerts).toEqual([]);
  });

  it('satisfies the data-model ranges', () => {
    const { current } = snapshot;
    expect(current.humidity).toBeGreaterThanOrEqual(0);
    expect(current.humidity).toBeLessThanOrEqual(100);
    expect(current.windDirection).toBeGreaterThanOrEqual(0);
    expect(current.windDirection).toBeLessThanOrEqual(359);
    expect(current.uvIndex).toBeGreaterThanOrEqual(0);
  });
});

describe('conditions and day/night', () => {
  it('maps a rainy night', () => {
    const { current } = parse(rainNight);
    expect(current.condition).toBe('rain');
    expect(current.summary).toBe('Moderate rain');
    expect(current.isDay).toBe(false);
  });

  it('maps a thunderstorm in daytime', () => {
    const { current } = parse(withAlerts);
    expect(current.condition).toBe('thunderstorm');
    expect(current.isDay).toBe(true);
  });

  it('maps snow', () => {
    expect(parse(extreme).current.condition).toBe('snow');
  });
});

describe('missing optional fields', () => {
  const snapshot = parse(missingOptionals);

  it('leaves optional current fields absent, never NaN or undefined-valued keys', () => {
    const { current } = snapshot;
    expect(current.uvIndex).toBeUndefined();
    expect(current.visibility).toBeUndefined();
    expect(current.windDirection).toBeUndefined();
    expect(current.windGust).toBeUndefined();
    for (const key of ['uvIndex', 'visibility', 'windDirection', 'windGust']) {
      expect(key in current).toBe(false);
    }
  });

  it('never produces NaN or infinite numbers', () => {
    const numbers = collectNumbers(snapshot);
    expect(numbers.length).toBeGreaterThan(0);
    expect(numbers.every(Number.isFinite)).toBe(true);
  });

  it('treats a missing pop as 0 percent', () => {
    expect(snapshot.hourly[3]?.precipChance).toBe(0);
  });

  it('falls back to daily sunrise/sunset when current has none', () => {
    const json = clone(clearDay) as any;
    delete json.current.sunrise;
    delete json.current.sunset;
    const { current } = parse(json);
    expect(current.sunrise).toBe(clearDay.daily[0]?.sunrise);
    expect(current.sunset).toBe(clearDay.daily[0]?.sunset);
  });

  it('uses 0 and day-time when no sun events exist anywhere (polar regions)', () => {
    const json = clone(clearDay) as any;
    delete json.current.sunrise;
    delete json.current.sunset;
    delete json.daily[0].sunrise;
    delete json.daily[0].sunset;
    const { current } = parse(json);
    expect(current.sunrise).toBe(0);
    expect(current.sunset).toBe(0);
    expect(current.isDay).toBe(true);
  });
});

describe('extreme values', () => {
  it('keeps -40 °C, 100% humidity, very high wind, and zero visibility', () => {
    const { current } = parse(extreme);
    expect(current.temperature).toBe(-40);
    expect(current.humidity).toBe(100);
    expect(current.windSpeed).toBe(70);
    expect(current.windDirection).toBe(359);
    expect(current.uvIndex).toBe(15.2);
    expect(current.visibility).toBe(0);
    expect(current.high).toBe(-35);
    expect(current.low).toBe(-48);
  });

  it('keeps 50 °C', () => {
    expect(parse(extremeHeat).current.temperature).toBe(50);
  });
});

describe('normalisation', () => {
  it('clamps humidity into 0-100', () => {
    const json = clone(clearDay);
    json.current.humidity = 120;
    expect(parse(json).current.humidity).toBe(100);
    json.current.humidity = -5;
    expect(parse(json).current.humidity).toBe(0);
  });

  it('wraps wind direction into 0-359', () => {
    const json = clone(clearDay);
    json.current.wind_deg = 360;
    expect(parse(json).current.windDirection).toBe(0);
    json.current.wind_deg = -10;
    expect(parse(json).current.windDirection).toBe(350);
  });

  it('clamps a negative UV index to 0', () => {
    const json = clone(clearDay);
    json.current.uvi = -0.5;
    expect(parse(json).current.uvIndex).toBe(0);
  });

  it('clamps pop outside 0-1', () => {
    const json = clone(clearDay);
    json.hourly[0]!.pop = 1.4;
    json.hourly[1]!.pop = -0.2;
    const { hourly } = parse(json);
    expect(hourly[0]?.precipChance).toBe(100);
    expect(hourly[1]?.precipChance).toBe(0);
  });

  it('sorts forecast entries ascending when the provider sends them out of order', () => {
    const json = clone(clearDay);
    json.hourly.reverse();
    json.daily.reverse();
    const { hourly, daily } = parse(json);
    expect(hourly[0]?.start).toBeLessThan(hourly[1]!.start);
    expect(daily[0]?.start).toBeLessThan(daily[1]!.start);
  });

  it('accepts fewer than 24 hourly and 7 daily entries', () => {
    const json = clone(clearDay);
    json.hourly = json.hourly.slice(0, 5);
    json.daily = json.daily.slice(0, 2);
    const { hourly, daily } = parse(json);
    expect(hourly).toHaveLength(5);
    expect(daily).toHaveLength(2);
  });

  it('maps unknown condition ids to the unknown category', () => {
    const json = clone(clearDay);
    json.current.weather[0]!.id = 9999;
    expect(parse(json).current.condition).toBe('unknown');
  });

  it('defaults timezone_offset to 0 when absent', () => {
    const json = clone(clearDay) as Record<string, unknown>;
    delete json.timezone_offset;
    expect(parse(json).timeZoneOffset).toBe(0);
  });
});

describe('alerts', () => {
  const { alerts } = parse(withAlerts);

  it('maps provider alerts', () => {
    expect(alerts).toHaveLength(3);
    const flood = alerts[0]!;
    expect(flood.event).toBe('Flood Warning');
    expect(flood.sender).toBe('NWS Miami');
    expect(flood.description).toMatch(/flooded roadways/);
    expect(flood.start).toBeLessThan(flood.end);
  });

  it('derives stable unique ids from sender, event and start', () => {
    const again = parse(withAlerts).alerts;
    expect(alerts.map((a) => a.id)).toEqual(again.map((a) => a.id));
    expect(new Set(alerts.map((a) => a.id)).size).toBe(alerts.length);
  });

  it('infers severity from the event name and falls back to unknown', () => {
    expect(alerts.map((a) => a.severity)).toEqual(['severe', 'moderate', 'unknown']);
  });

  it.each([
    ['Tornado Emergency', 'extreme'],
    ['Extreme Wind Warning', 'extreme'],
    ['Flood Warning', 'severe'],
    ['Flood Watch', 'moderate'],
    ['Frost Advisory', 'minor'],
    ['Special Weather Statement', 'unknown'],
    ['', 'unknown'],
  ])('rates "%s" as %s', (event, expected) => {
    const json = clone(withAlerts);
    json.alerts = [{ ...json.alerts[0]!, event }];
    expect(parse(json).alerts[0]?.severity).toBe(expected);
  });

  it('tolerates alerts without description or tags', () => {
    const json = clone(withAlerts) as any;
    delete json.alerts[0].description;
    delete json.alerts[0].tags;
    expect(parse(json).alerts[0]?.description).toBe('');
  });
});

describe('malformed responses', () => {
  it('rejects a response missing a required field with malformed-response', () => {
    expect(malformedKind(malformed)).toBe('malformed-response');
  });

  it('rejects empty hourly/daily arrays with malformed-response', () => {
    expect(malformedKind(emptyArrays)).toBe('malformed-response');
  });

  it.each([null, undefined, 42, 'text', [], {}])('rejects non-weather body %p', (body) => {
    expect(malformedKind(body)).toBe('malformed-response');
  });

  it('rejects a response with no weather condition entry', () => {
    const json = clone(clearDay);
    json.current.weather = [];
    expect(malformedKind(json)).toBe('malformed-response');
  });

  it('rejects wrongly typed required fields', () => {
    const json = clone(clearDay) as any;
    json.current.temp = '17';
    expect(malformedKind(json)).toBe('malformed-response');
  });
});
