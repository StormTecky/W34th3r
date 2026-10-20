import type { DailyForecastEntry, HourlyForecastEntry, WeatherSnapshot } from '@/domain/types';
import { buildDailyRows, buildHourlyRows } from '@/features/forecast/forecast-view-model';
import { buildSnapshot } from '@/providers/fake/scenarios';

const utc = (iso: string) => Math.floor(Date.parse(iso) / 1000);

function snapshotAt(
  iso: string,
  timeZone: string,
  scenario: Parameters<typeof buildSnapshot>[0] = 'clear-day',
): WeatherSnapshot {
  return buildSnapshot(scenario, { placeId: 'p', timeZone, now: utc(iso) });
}

const parisNow = utc('2026-10-20T12:20:00Z');
const paris = snapshotAt('2026-10-20T12:20:00Z', 'Europe/Paris');
const options = { units: 'c', now: parisNow } as const;

describe('buildHourlyRows', () => {
  it('returns one row per hourly entry, labelling the first "Now"', () => {
    const rows = buildHourlyRows(paris, options);
    expect(rows).toHaveLength(24);
    expect(rows[0]?.timeLabel).toBe('Now');
    // 13:00 UTC is 3 PM in Paris (UTC+2).
    expect(rows[1]?.timeLabel).toBe('3 PM');
    expect(rows[2]?.timeLabel).toBe('4 PM');
  });

  it('formats temperatures in the chosen unit', () => {
    expect(buildHourlyRows(paris, options)[0]?.temperatureLabel).toBe(
      `${Math.round(paris.hourly[0]!.temperature)}°`,
    );
    const fahrenheit = buildHourlyRows(paris, { ...options, units: 'f' })[0]!;
    expect(fahrenheit.temperatureLabel).toBe(
      `${Math.round((paris.hourly[0]!.temperature * 9) / 5 + 32)}°`,
    );
  });

  it('shows a precipitation label only from 10 percent, but always keeps it for screen readers', () => {
    const hourly: HourlyForecastEntry[] = [0, 5, 10, 40, 100].map((precipChance, i) => ({
      ...paris.hourly[0]!,
      start: paris.hourly[0]!.start + i * 3600,
      precipChance,
    }));
    const rows = buildHourlyRows({ ...paris, hourly }, options);
    expect(rows.map((row) => row.precipLabel)).toEqual([null, null, '10%', '40%', '100%']);
    expect(rows[1]?.a11yLabel).toMatch(/5 percent chance of precipitation/);
    expect(rows[3]?.a11yLabel).toMatch(/40 percent chance of precipitation/);
  });

  it('writes a full sentence for screen readers', () => {
    const [first] = buildHourlyRows(paris, options);
    expect(first?.a11yLabel).toMatch(
      /^Now, \d+ degrees, Clear sky, \d+ percent chance of precipitation\.$/,
    );
  });

  it('marks hours as day or night using the place sun times, repeated each day', () => {
    // Sun is up from 08:20Z to 20:20Z on the day of the snapshot.
    const rows = buildHourlyRows(paris, options);
    const dayAt = (iso: string) => rows.find((row) => row.start === utc(iso))?.isDay;
    expect(dayAt('2026-10-20T13:00:00Z')).toBe(true);
    expect(dayAt('2026-10-20T21:00:00Z')).toBe(false);
    expect(dayAt('2026-10-21T03:00:00Z')).toBe(false);
    expect(dayAt('2026-10-21T10:00:00Z')).toBe(true);
  });

  it('labels hours in the place time zone across midnight', () => {
    // 23:30 in New York on 20 October.
    const ny = snapshotAt('2026-10-21T03:30:00Z', 'America/New_York');
    const rows = buildHourlyRows(ny, { units: 'c', now: utc('2026-10-21T03:30:00Z') });
    expect(rows.slice(0, 4).map((row) => row.timeLabel)).toEqual(['Now', '12 AM', '1 AM', '2 AM']);
  });

  it('keeps keys unique even when clocks fall back and an hour repeats', () => {
    const ny = snapshotAt('2026-11-01T04:30:00Z', 'America/New_York');
    const rows = buildHourlyRows(ny, { units: 'c', now: utc('2026-11-01T04:30:00Z') });
    expect(rows.slice(0, 5).map((row) => row.timeLabel)).toEqual([
      'Now',
      '1 AM',
      '1 AM',
      '2 AM',
      '3 AM',
    ]);
    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });

  it('renders what exists when fewer than 24 entries arrive', () => {
    const rows = buildHourlyRows({ ...paris, hourly: paris.hourly.slice(0, 5) }, options);
    expect(rows).toHaveLength(5);
  });

  it('returns nothing for an empty forecast', () => {
    expect(buildHourlyRows({ ...paris, hourly: [] }, options)).toEqual([]);
  });

  it('uses the provider offset when the time zone is rejected by the runtime', () => {
    const odd = { ...paris, timeZone: 'Not/AZone', timeZoneOffset: 7200 };
    expect(buildHourlyRows(odd, options)[1]?.timeLabel).toBe('3 PM');
  });
});

describe('buildDailyRows', () => {
  it('returns seven rows labelled Today, Tomorrow, then weekday names', () => {
    const rows = buildDailyRows(paris, options);
    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.dayLabel)).toEqual([
      'Today',
      'Tomorrow',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Monday',
    ]);
  });

  it('judges Today and Tomorrow on the place calendar across midnight', () => {
    // It is 23:30 on 20 October in New York, but already the 21st in UTC.
    const ny = snapshotAt('2026-10-21T03:30:00Z', 'America/New_York');
    const rows = buildDailyRows(ny, { units: 'c', now: utc('2026-10-21T03:30:00Z') });
    expect(rows[0]?.dayLabel).toBe('Today');
    expect(rows[1]?.dayLabel).toBe('Tomorrow');
    expect(rows[2]?.dayLabel).toBe('Thursday');
  });

  it('formats high and low in the chosen unit', () => {
    const day = paris.daily[0] as DailyForecastEntry;
    const celsius = buildDailyRows(paris, options)[0]!;
    expect(celsius.highLabel).toBe(`${Math.round(day.high)}°`);
    expect(celsius.lowLabel).toBe(`${Math.round(day.low)}°`);
    const fahrenheit = buildDailyRows(paris, { ...options, units: 'f' })[0]!;
    expect(fahrenheit.highLabel).toBe(`${Math.round((day.high * 9) / 5 + 32)}°`);
  });

  it('places each day inside the week range as fractions from 0 to 1', () => {
    const rows = buildDailyRows(paris, options);
    for (const row of rows) {
      expect(row.rangeStart).toBeGreaterThanOrEqual(0);
      expect(row.rangeEnd).toBeLessThanOrEqual(1);
      expect(row.rangeStart).toBeLessThanOrEqual(row.rangeEnd);
    }
    expect(Math.min(...rows.map((row) => row.rangeStart))).toBe(0);
    expect(Math.max(...rows.map((row) => row.rangeEnd))).toBe(1);
  });

  it('shows a full-width range when every day has the same temperatures', () => {
    const flat = paris.daily.map((day) => ({ ...day, high: 10, low: 10 }));
    const rows = buildDailyRows({ ...paris, daily: flat }, options);
    for (const row of rows) {
      expect(row.rangeStart).toBe(0);
      expect(row.rangeEnd).toBe(1);
    }
  });

  it('handles extreme cold without losing signs or breaking the range', () => {
    const cold = snapshotAt('2026-10-20T12:20:00Z', 'America/Anchorage', 'extreme-values');
    const rows = buildDailyRows(cold, options);
    expect(rows[0]?.highLabel).toBe('-36°');
    expect(rows[0]?.lowLabel).toBe('-46°');
    for (const row of rows) expect(row.rangeStart).toBeLessThanOrEqual(row.rangeEnd);
  });

  it('shows the chance of precipitation from 10 percent and always reads it aloud', () => {
    const rows = buildDailyRows(
      { ...paris, daily: paris.daily.map((d, i) => ({ ...d, precipChance: i === 0 ? 5 : 40 })) },
      options,
    );
    expect(rows[0]?.precipLabel).toBeNull();
    expect(rows[1]?.precipLabel).toBe('40%');
    expect(rows[0]?.a11yLabel).toMatch(/5 percent chance of precipitation/);
  });

  it('writes a full sentence for screen readers', () => {
    const day = paris.daily[1]!;
    const row = buildDailyRows(paris, options)[1]!;
    expect(row.a11yLabel).toBe(
      `Tomorrow, high ${Math.round(day.high)}, low ${Math.round(day.low)}, Clear sky, ${day.precipChance} percent chance of precipitation.`,
    );
  });

  it('keeps keys unique and renders what exists for fewer than seven days', () => {
    const rows = buildDailyRows({ ...paris, daily: paris.daily.slice(0, 3) }, options);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((row) => row.key)).size).toBe(3);
  });

  it('returns nothing for an empty forecast', () => {
    expect(buildDailyRows({ ...paris, daily: [] }, options)).toEqual([]);
  });
});
