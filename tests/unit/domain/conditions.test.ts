import { categoryFromOpenWeatherId, isDayAt, isDayForInstant } from '@/domain/conditions';

describe('categoryFromOpenWeatherId', () => {
  it.each([
    [200, 'thunderstorm'],
    [232, 'thunderstorm'],
    [300, 'drizzle'],
    [321, 'drizzle'],
    [500, 'rain'],
    [504, 'rain'],
    [511, 'sleet'],
    [520, 'rain'],
    [531, 'rain'],
    [600, 'snow'],
    [602, 'snow'],
    [611, 'sleet'],
    [613, 'sleet'],
    [615, 'sleet'],
    [616, 'sleet'],
    [620, 'snow'],
    [622, 'snow'],
    [701, 'mist-fog'],
    [721, 'mist-fog'],
    [741, 'mist-fog'],
    [711, 'dust-smoke'],
    [731, 'dust-smoke'],
    [751, 'dust-smoke'],
    [761, 'dust-smoke'],
    [762, 'dust-smoke'],
    [771, 'squall-tornado'],
    [781, 'squall-tornado'],
    [800, 'clear'],
    [801, 'partly-cloudy'],
    [802, 'partly-cloudy'],
    [803, 'cloudy'],
    [804, 'cloudy'],
  ])('maps %i to %s', (id, expected) => {
    expect(categoryFromOpenWeatherId(id)).toBe(expected);
  });

  it.each([0, -1, 199, 450, 999, 1000, NaN])('maps unmapped id %p to unknown', (id) => {
    expect(categoryFromOpenWeatherId(id)).toBe('unknown');
  });
});

describe('isDayAt', () => {
  const sunrise = 1_000_000;
  const sunset = 1_043_200;

  it('is day between sunrise and sunset', () => {
    expect(isDayAt(1_020_000, sunrise, sunset)).toBe(true);
  });

  it('is night before sunrise and after sunset', () => {
    expect(isDayAt(sunrise - 1, sunrise, sunset)).toBe(false);
    expect(isDayAt(sunset + 1, sunrise, sunset)).toBe(false);
  });

  it('treats the exact sunrise as day and the exact sunset as night', () => {
    expect(isDayAt(sunrise, sunrise, sunset)).toBe(true);
    expect(isDayAt(sunset, sunrise, sunset)).toBe(false);
  });

  it('handles a sunset that is earlier than the sunrise (day spans the date boundary)', () => {
    const lateSunrise = 1_000_000;
    const earlySunset = 960_000;
    expect(isDayAt(1_010_000, lateSunrise, earlySunset)).toBe(true);
    expect(isDayAt(950_000, lateSunrise, earlySunset)).toBe(true);
    expect(isDayAt(980_000, lateSunrise, earlySunset)).toBe(false);
  });

  it('falls back to day when the provider reports no sun events (polar regions)', () => {
    expect(isDayAt(1_020_000, 0, 0)).toBe(true);
    expect(isDayAt(1_020_000, 1_000_000, 1_000_000)).toBe(true);
  });
});

describe('isDayForInstant', () => {
  const DAY = 86_400;
  const sunrise = 1_000_000;
  const sunset = sunrise + 12 * 3600;

  it('matches isDayAt on the reference day', () => {
    expect(isDayForInstant(sunrise + 3600, sunrise, sunset)).toBe(true);
    expect(isDayForInstant(sunset + 3600, sunrise, sunset)).toBe(false);
  });

  it('repeats the pattern on following days', () => {
    expect(isDayForInstant(sunrise + DAY + 3600, sunrise, sunset)).toBe(true);
    expect(isDayForInstant(sunset + DAY + 3600, sunrise, sunset)).toBe(false);
    expect(isDayForInstant(sunrise + 3 * DAY + 3600, sunrise, sunset)).toBe(true);
  });

  it('works for instants before the reference sunrise', () => {
    expect(isDayForInstant(sunrise - 3600, sunrise, sunset)).toBe(false);
    expect(isDayForInstant(sunrise - DAY + 3600, sunrise, sunset)).toBe(true);
  });

  it('falls back to day when there are no sun events', () => {
    expect(isDayForInstant(5_000_000, 0, 0)).toBe(true);
  });
});
