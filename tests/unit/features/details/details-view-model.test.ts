import type { WeatherAlert, WeatherSnapshot } from '@/domain/types';
import {
  alertPeriodLabel,
  buildDetails,
  compassPoint,
  sortAlerts,
  uvCategory,
} from '@/features/details/details-view-model';
import { buildSnapshot, type DataScenario } from '@/providers/fake/scenarios';

const utc = (iso: string) => Math.floor(Date.parse(iso) / 1000);
const NOW = utc('2026-10-20T12:20:00Z');

function snapshot(
  scenario: DataScenario = 'clear-day',
  timeZone = 'Europe/Paris',
): WeatherSnapshot {
  return buildSnapshot(scenario, { placeId: 'p', timeZone, now: NOW });
}

const kmh = { windSpeedUnit: 'kmh', now: NOW } as const;

describe('compassPoint', () => {
  it.each([
    [0, 'N', 'north', 'from north'],
    [22.5, 'NNE', 'north-northeast', 'from north-northeast'],
    [45, 'NE', 'northeast', 'from northeast'],
    [90, 'E', 'east', 'from east'],
    [135, 'SE', 'southeast', 'from southeast'],
    [180, 'S', 'south', 'from south'],
    [250, 'WSW', 'west-southwest', 'from west-southwest'],
    [270, 'W', 'west', 'from west'],
    [337.5, 'NNW', 'north-northwest', 'from north-northwest'],
  ])('maps %d degrees to %s', (degrees, abbreviation, name, from) => {
    expect(compassPoint(degrees)).toEqual({ abbreviation, name, from });
  });

  it.each([
    [0, 'N', 'nord', 'du nord'],
    [90, 'E', 'est', "de l'est"],
    [180, 'S', 'sud', 'du sud'],
    [250, 'OSO', 'ouest-sud-ouest', "de l'ouest-sud-ouest"],
    [270, 'O', 'ouest', "de l'ouest"],
    [337.5, 'NNO', 'nord-nord-ouest', 'du nord-nord-ouest'],
  ])('names %d degrees in French as %s', (degrees, abbreviation, name, from) => {
    expect(compassPoint(degrees, 'fr-FR')).toEqual({ abbreviation, name, from });
  });

  it('wraps at the top of the circle and for out-of-range values', () => {
    expect(compassPoint(348.75).abbreviation).toBe('N');
    expect(compassPoint(359).abbreviation).toBe('N');
    expect(compassPoint(360).abbreviation).toBe('N');
    expect(compassPoint(-10).abbreviation).toBe('N');
    expect(compassPoint(-90).abbreviation).toBe('W');
    expect(compassPoint(450).abbreviation).toBe('E');
  });
});

describe('uvCategory', () => {
  it.each([
    [0, 'Low'],
    [2.4, 'Low'],
    [2.5, 'Moderate'],
    [5.4, 'Moderate'],
    [5.5, 'High'],
    [7.4, 'High'],
    [7.5, 'Very high'],
    [10.4, 'Very high'],
    [10.5, 'Extreme'],
    [15.2, 'Extreme'],
  ])('rates a UV index of %d as %s', (uvi, category) => {
    expect(uvCategory(uvi)).toBe(category);
  });
});

describe('buildDetails: wind', () => {
  it('formats speed, gust and compass direction in the chosen unit', () => {
    const { wind } = buildDetails(snapshot(), kmh);
    expect(wind).toMatchObject({
      speedLabel: '12 km/h',
      gustLabel: '22 km/h',
      directionLabel: 'WSW',
      degrees: 250,
    });
    expect(wind.a11yLabel).toBe('Wind 12 km/h from west-southwest, gusts 22 km/h');
    expect(buildDetails(snapshot(), { ...kmh, windSpeedUnit: 'mph' }).wind.speedLabel).toBe(
      '7 mph',
    );
    expect(buildDetails(snapshot(), { ...kmh, windSpeedUnit: 'kn' }).wind.speedLabel).toBe('6 kn');
    expect(buildDetails(snapshot(), { ...kmh, windSpeedUnit: 'ms' }).wind.speedLabel).toBe(
      '3.2 m/s',
    );
  });

  it('omits gust and direction when the provider has none', () => {
    const { wind } = buildDetails(snapshot('missing-optionals'), kmh);
    expect(wind.gustLabel).toBeNull();
    expect(wind.directionLabel).toBeNull();
    expect(wind.degrees).toBeNull();
    expect(wind.a11yLabel).toBe('Wind 17 km/h');
  });

  it('handles very high winds', () => {
    const { wind } = buildDetails(snapshot('extreme-values'), kmh);
    expect(wind.speedLabel).toBe('252 km/h');
    expect(wind.directionLabel).toBe('N');
  });
});

describe('buildDetails: humidity, pressure and visibility', () => {
  it('formats humidity and pressure', () => {
    const model = buildDetails(snapshot(), kmh);
    expect(model.humidity).toEqual({ label: '48%', value: 48 });
    expect(model.pressure.label).toBe('1018 hPa');
    expect(buildDetails(snapshot('extreme-values'), kmh).humidity.label).toBe('100%');
  });

  it('shows visibility in km, or miles for mph users', () => {
    expect(buildDetails(snapshot(), kmh).visibility).toEqual({ available: true, label: '10 km' });
    const miles = buildDetails(snapshot(), { ...kmh, windSpeedUnit: 'mph' });
    expect(miles.visibility.label).toBe('6.2 mi');
  });

  it('reports unavailable visibility, but treats zero visibility as real data', () => {
    expect(buildDetails(snapshot('missing-optionals'), kmh).visibility).toEqual({
      available: false,
      label: 'Unavailable',
    });
    expect(buildDetails(snapshot('extreme-values'), kmh).visibility).toEqual({
      available: true,
      label: '0 km',
    });
  });
});

describe('buildDetails: UV index', () => {
  it('shows the rounded index, its category, advice and its place on the 0-11 scale', () => {
    const { uv } = buildDetails(snapshot(), kmh);
    expect(uv.available).toBe(true);
    expect(uv.label).toBe('5');
    expect(uv.category).toBe('Moderate');
    expect(uv.categoryLabel).toBe('Moderate');
    expect(uv.advice).toBe('Wear sunscreen and sunglasses.');
    expect(uv.fraction).toBeCloseTo(5.2 / 11, 5);
  });

  it('caps the scale position at 1 for extreme values', () => {
    const { uv } = buildDetails(snapshot('extreme-values'), kmh);
    expect(uv.label).toBe('15');
    expect(uv.category).toBe('Extreme');
    expect(uv.fraction).toBe(1);
  });

  it('is unavailable without a value, instead of showing a misleading zero', () => {
    expect(buildDetails(snapshot('missing-optionals'), kmh).uv).toEqual({
      available: false,
      label: 'Unavailable',
      category: null,
      categoryLabel: null,
      advice: null,
      value: null,
      fraction: 0,
    });
  });

  it('gives each category distinct advice', () => {
    const advice = [0, 4, 7, 9, 12].map((uvi) => {
      const s = snapshot();
      s.current.uvIndex = uvi;
      return buildDetails(s, kmh).uv.advice;
    });
    expect(new Set(advice).size).toBe(5);
  });
});

describe('buildDetails: sunrise and sunset', () => {
  it('shows times in the place time zone, not the device zone', () => {
    const paris = buildDetails(snapshot('clear-day', 'Europe/Paris'), kmh).sun;
    expect(paris).toMatchObject({
      available: true,
      sunriseLabel: '10:20 AM',
      sunsetLabel: '10:20 PM',
    });
    const tokyo = buildDetails(snapshot('clear-day', 'Asia/Tokyo'), kmh).sun;
    expect(tokyo).toMatchObject({ sunriseLabel: '5:20 PM', sunsetLabel: '5:20 AM' });
    const kolkata = buildDetails(snapshot('clear-day', 'Asia/Kolkata'), kmh).sun;
    expect(kolkata.sunriseLabel).toBe('1:50 PM');
  });

  it('places the sun between sunrise and sunset during the day', () => {
    const { sun } = buildDetails(snapshot(), kmh);
    expect(sun.isDay).toBe(true);
    expect(sun.progress).toBeCloseTo(4 / 12, 5);
  });

  it('pins the sun to the horizon at night', () => {
    const after = buildDetails(snapshot('rain-night'), kmh).sun; // sunset was 2 hours ago
    expect(after.isDay).toBe(false);
    expect(after.progress).toBe(1);
    const before = buildDetails(snapshot(), { ...kmh, now: NOW - 6 * 3600 }).sun;
    expect(before.progress).toBe(0);
  });

  it('is unavailable when the provider reports no sun events (polar regions)', () => {
    const s = snapshot();
    s.current.sunrise = 0;
    s.current.sunset = 0;
    expect(buildDetails(s, kmh).sun).toEqual({
      available: false,
      sunriseLabel: 'Unavailable',
      sunsetLabel: 'Unavailable',
      progress: 0,
      isDay: true,
    });
  });

  it('falls back to the provider offset for a rejected time zone', () => {
    const s = { ...snapshot(), timeZone: 'Not/AZone', timeZoneOffset: 7200 };
    expect(buildDetails(s, kmh).sun.sunriseLabel).toBe('10:20 AM');
  });
});

describe('alerts', () => {
  const alert = (id: string, severity: WeatherAlert['severity'], start: number): WeatherAlert => ({
    id,
    event: `Event ${id}`,
    sender: 'NWS',
    description: 'text',
    start,
    end: start + 3600,
    severity,
  });

  it('sorts most severe first, then earliest start, without mutating the input', () => {
    const input = [
      alert('a', 'minor', 5),
      alert('b', 'extreme', 9),
      alert('c', 'severe', 7),
      alert('d', 'severe', 3),
      alert('e', 'unknown', 1),
    ];
    const copy = [...input];
    expect(sortAlerts(input).map((a) => a.id)).toEqual(['b', 'd', 'c', 'a', 'e']);
    expect(input).toEqual(copy);
  });

  describe('alertPeriodLabel', () => {
    const base = alert('x', 'severe', utc('2026-10-20T15:00:00Z'));
    const period = (a: WeatherAlert) => alertPeriodLabel(a, 'Europe/Paris', NOW);

    it('names the day and local time when the alert spans midnight', () => {
      expect(period({ ...base, end: utc('2026-10-21T03:00:00Z') })).toBe(
        'Today 5:00 PM – Tomorrow 5:00 AM',
      );
    });

    it('omits the repeated day when start and end share a day', () => {
      expect(period({ ...base, end: utc('2026-10-20T18:00:00Z') })).toBe('Today 5:00 PM – 8:00 PM');
    });

    it('uses weekday names further away', () => {
      expect(
        period({ ...base, start: utc('2026-10-22T10:00:00Z'), end: utc('2026-10-23T10:00:00Z') }),
      ).toBe('Thursday 12:00 PM – Friday 12:00 PM');
    });
  });
});

describe('buildDetails in French', () => {
  const fr = { ...kmh, locale: 'fr-FR' };

  it('speaks the wind in French, with the compass letters and "du/de l\'" forms', () => {
    const { wind } = buildDetails(snapshot(), fr);
    expect(wind).toMatchObject({
      speedLabel: '12 km/h',
      gustLabel: '22 km/h',
      directionLabel: 'OSO',
    });
    expect(wind.a11yLabel).toBe("Vent 12 km/h de l'ouest-sud-ouest, rafales 22 km/h");
    expect(buildDetails(snapshot(), { ...fr, windSpeedUnit: 'ms' }).wind.speedLabel).toBe(
      '3,2 m/s',
    );
    expect(buildDetails(snapshot('missing-optionals'), fr).wind.a11yLabel).toBe('Vent 17 km/h');
  });

  it('formats humidity, pressure and visibility the French way', () => {
    const model = buildDetails(snapshot(), fr);
    expect(model.humidity).toEqual({ label: '48\u00a0%', value: 48 });
    expect(model.pressure.label).toBe('1018 hPa');
    expect(model.visibility).toEqual({ available: true, label: '10 km' });
    expect(buildDetails(snapshot('missing-optionals'), fr).visibility.label).toBe('Indisponible');
  });

  it('names the UV category and advice in French but keeps the stable category id', () => {
    const { uv } = buildDetails(snapshot(), fr);
    expect(uv).toMatchObject({
      category: 'Moderate',
      categoryLabel: 'Modéré',
      advice: 'Portez de la crème solaire et des lunettes de soleil.',
    });
    expect(buildDetails(snapshot('extreme-values'), fr).uv.categoryLabel).toBe('Extrême');
    expect(buildDetails(snapshot('missing-optionals'), fr).uv.label).toBe('Indisponible');
  });

  it('shows sun times with the place zone and the French clock', () => {
    const paris = buildDetails(snapshot('clear-day', 'Europe/Paris'), fr).sun;
    expect(paris).toMatchObject({ sunriseLabel: '10:20', sunsetLabel: '22:20' });
    const s = snapshot();
    s.current.sunrise = 0;
    s.current.sunset = 0;
    expect(buildDetails(s, fr).sun.sunriseLabel).toBe('Indisponible');
  });

  it('writes the alert period with French day names and a 24-hour clock', () => {
    const start = utc('2026-10-20T15:00:00Z');
    const alert: WeatherAlert = {
      id: 'x',
      event: 'Vigilance orange',
      sender: 'Météo-France',
      description: '',
      start,
      end: utc('2026-10-21T03:00:00Z'),
      severity: 'severe',
    };
    expect(alertPeriodLabel(alert, 'Europe/Paris', NOW, undefined, 'fr-FR')).toBe(
      "Aujourd'hui 17:00 – Demain 5:00",
    );
  });
});
