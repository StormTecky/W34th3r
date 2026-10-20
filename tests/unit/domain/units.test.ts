import {
  celsiusToFahrenheit,
  convertPrecipitation,
  convertTemperature,
  convertWindSpeed,
  defaultUnitsForRegion,
  formatHumidity,
  formatPercent,
  formatPrecipitation,
  formatPressure,
  formatTemperature,
  formatVisibility,
  formatWindSpeed,
} from '@/domain/units';

describe('temperature', () => {
  it('converts celsius to fahrenheit', () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
    expect(celsiusToFahrenheit(37)).toBeCloseTo(98.6, 5);
  });

  it('leaves celsius untouched and converts for fahrenheit', () => {
    expect(convertTemperature(21.5, 'c')).toBe(21.5);
    expect(convertTemperature(21.5, 'f')).toBeCloseTo(70.7, 5);
  });

  it('formats rounded values with a degree sign', () => {
    expect(formatTemperature(21.4, 'c')).toBe('21°');
    expect(formatTemperature(21.5, 'c')).toBe('22°');
    expect(formatTemperature(21.5, 'f')).toBe('71°');
  });

  it('never renders negative zero', () => {
    expect(formatTemperature(-0.4, 'c')).toBe('0°');
    expect(formatTemperature(0, 'c')).toBe('0°');
  });

  it('handles extreme values without losing the sign', () => {
    expect(formatTemperature(-40, 'c')).toBe('-40°');
    expect(formatTemperature(-40, 'f')).toBe('-40°');
    expect(formatTemperature(50, 'c')).toBe('50°');
    expect(formatTemperature(50, 'f')).toBe('122°');
  });
});

describe('wind speed', () => {
  it('converts metres per second to each unit', () => {
    expect(convertWindSpeed(10, 'ms')).toBe(10);
    expect(convertWindSpeed(10, 'kmh')).toBeCloseTo(36, 5);
    expect(convertWindSpeed(10, 'mph')).toBeCloseTo(22.369, 3);
    expect(convertWindSpeed(10, 'kn')).toBeCloseTo(19.438, 3);
    expect(convertWindSpeed(0, 'kmh')).toBe(0);
  });

  it('formats with unit labels', () => {
    expect(formatWindSpeed(10, 'kmh')).toBe('36 km/h');
    expect(formatWindSpeed(10, 'mph')).toBe('22 mph');
    expect(formatWindSpeed(10, 'kn')).toBe('19 kn');
    expect(formatWindSpeed(3.46, 'ms')).toBe('3.5 m/s');
    expect(formatWindSpeed(0, 'kmh')).toBe('0 km/h');
  });

  it('handles very high winds', () => {
    expect(formatWindSpeed(70, 'kmh')).toBe('252 km/h');
  });
});

describe('rounding tiny negative values', () => {
  it('never shows a negative zero', () => {
    expect(formatWindSpeed(-0.01, 'ms')).toBe('0 m/s');
    expect(formatVisibility(-10, 'kmh')).toBe('0 km');
    expect(formatPrecipitation(-0.001, 'mm')).toBe('0 mm');
  });
});

describe('precipitation', () => {
  it('converts millimetres to inches', () => {
    expect(convertPrecipitation(25.4, 'mm')).toBe(25.4);
    expect(convertPrecipitation(25.4, 'in')).toBeCloseTo(1, 5);
  });

  it('formats with sensible precision', () => {
    expect(formatPrecipitation(2.54, 'mm')).toBe('2.5 mm');
    expect(formatPrecipitation(2.54, 'in')).toBe('0.10 in');
    expect(formatPrecipitation(0, 'mm')).toBe('0 mm');
    expect(formatPrecipitation(0, 'in')).toBe('0 in');
  });
});

describe('other measurements', () => {
  it('formats pressure in hPa', () => {
    expect(formatPressure(1013.4)).toBe('1013 hPa');
  });

  it('formats percentages and clamps humidity to 0-100', () => {
    expect(formatPercent(40.2)).toBe('40%');
    expect(formatHumidity(100)).toBe('100%');
    expect(formatHumidity(120)).toBe('100%');
    expect(formatHumidity(-3)).toBe('0%');
  });

  it('formats visibility in km, or miles when wind speed is shown in mph', () => {
    expect(formatVisibility(10000, 'kmh')).toBe('10 km');
    expect(formatVisibility(4500, 'ms')).toBe('4.5 km');
    expect(formatVisibility(800, 'kn')).toBe('0.8 km');
    expect(formatVisibility(16093.44, 'mph')).toBe('10 mi');
    expect(formatVisibility(1609.344, 'mph')).toBe('1 mi');
  });
});

describe('defaultUnitsForRegion', () => {
  it('uses imperial units for the US', () => {
    expect(defaultUnitsForRegion('US')).toEqual({
      temperatureUnit: 'f',
      windSpeedUnit: 'mph',
      precipitationUnit: 'in',
    });
  });

  it('uses metric units elsewhere, including unknown regions', () => {
    const metric = { temperatureUnit: 'c', windSpeedUnit: 'kmh', precipitationUnit: 'mm' };
    expect(defaultUnitsForRegion('FR')).toEqual(metric);
    expect(defaultUnitsForRegion(null)).toEqual(metric);
    expect(defaultUnitsForRegion(undefined)).toEqual(metric);
  });

  it('is case-insensitive', () => {
    expect(defaultUnitsForRegion('us').temperatureUnit).toBe('f');
  });
});
