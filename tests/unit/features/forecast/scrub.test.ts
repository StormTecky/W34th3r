import type { HourlyRow } from '@/features/forecast/forecast-view-model';
import {
  buildMoment,
  clampIndex,
  indexFromPosition,
  positionFromIndex,
} from '@/features/forecast/scrub';

describe('indexFromPosition', () => {
  it('maps the left edge to the first hour and the right edge to the last', () => {
    expect(indexFromPosition(0, 240, 24)).toBe(0);
    expect(indexFromPosition(240, 240, 24)).toBe(23);
  });

  it('maps the middle to the middle hour', () => {
    expect(indexFromPosition(120, 240, 25)).toBe(12);
  });

  it('snaps to the nearest hour', () => {
    // 24 hours over 230 points: 10 points per step.
    expect(indexFromPosition(14, 230, 24)).toBe(1);
    expect(indexFromPosition(16, 230, 24)).toBe(2);
  });

  it('clamps touches outside the bar', () => {
    expect(indexFromPosition(-50, 240, 24)).toBe(0);
    expect(indexFromPosition(900, 240, 24)).toBe(23);
  });

  it('returns 0 when there is nothing to scrub or the width is unknown', () => {
    expect(indexFromPosition(100, 240, 0)).toBe(0);
    expect(indexFromPosition(100, 240, 1)).toBe(0);
    expect(indexFromPosition(100, 0, 24)).toBe(0);
    expect(indexFromPosition(NaN, 240, 24)).toBe(0);
  });
});

describe('positionFromIndex', () => {
  it('is the inverse of indexFromPosition at each step', () => {
    for (let i = 0; i < 24; i++) {
      expect(indexFromPosition(positionFromIndex(i, 24) * 230, 230, 24)).toBe(i);
    }
  });

  it('spans 0 to 1 and tolerates a single hour', () => {
    expect(positionFromIndex(0, 24)).toBe(0);
    expect(positionFromIndex(23, 24)).toBe(1);
    expect(positionFromIndex(0, 1)).toBe(0);
    expect(positionFromIndex(0, 0)).toBe(0);
  });
});

describe('clampIndex', () => {
  it('keeps an index inside the available hours', () => {
    expect(clampIndex(-3, 24)).toBe(0);
    expect(clampIndex(5, 24)).toBe(5);
    expect(clampIndex(99, 24)).toBe(23);
    expect(clampIndex(4, 0)).toBe(0);
    expect(clampIndex(2.6, 24)).toBe(3);
  });
});

describe('buildMoment', () => {
  const row = (over: Partial<HourlyRow> = {}): HourlyRow => ({
    key: '1',
    start: 1,
    timeLabel: '3 PM',
    dayTimeLabel: 'Today 3 PM',
    temperatureLabel: '14°',
    temperature: 14.2,
    precipChance: 40,
    condition: 'rain',
    isDay: false,
    summary: 'Light rain',
    precipLabel: '40%',
    a11yLabel: 'x',
    ...over,
  });
  const rows = [row({ key: '0', timeLabel: 'Now' }), row()];

  it('is null for "now" (index 0) because the live conditions are already shown', () => {
    expect(buildMoment(rows, 0)).toBeNull();
  });

  it('describes the chosen hour', () => {
    expect(buildMoment(rows, 1)).toEqual({
      dayTimeLabel: 'Today 3 PM',
      temperature: 14.2,
      condition: 'rain',
      isDay: false,
      summary: 'Light rain',
      precipChance: 40,
    });
  });

  it('is null for an index with no row, instead of throwing', () => {
    expect(buildMoment(rows, 7)).toBeNull();
    expect(buildMoment([], 1)).toBeNull();
    expect(buildMoment(rows, -1)).toBeNull();
  });
});
