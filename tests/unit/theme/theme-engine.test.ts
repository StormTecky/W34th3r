import { CONDITION_CATEGORIES, type ConditionCategory } from '@/domain/types';
import { contrastRatio } from '@/theme/contrast';
import { getTheme } from '@/theme/theme-engine';

const PAIRS = CONDITION_CATEGORIES.flatMap((condition) =>
  [true, false].map((isDay) => [condition, isDay] as const),
);

describe('getTheme', () => {
  it('covers every condition for both day and night', () => {
    expect(PAIRS).toHaveLength(CONDITION_CATEGORIES.length * 2);
    for (const [condition, isDay] of PAIRS) {
      const theme = getTheme(condition, isDay);
      expect(theme.gradient).toHaveLength(3);
      for (const stop of theme.gradient) expect(stop).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each(CONDITION_CATEGORIES)('gives %s different day and night looks', (condition) => {
    expect(getTheme(condition, true).gradient).not.toEqual(getTheme(condition, false).gradient);
  });

  it('gives different conditions different daytime looks', () => {
    const clear = getTheme('clear', true).gradient;
    const rain = getTheme('rain', true).gradient;
    const snow = getTheme('snow', true).gradient;
    expect(clear).not.toEqual(rain);
    expect(rain).not.toEqual(snow);
    expect(clear).not.toEqual(snow);
  });

  it('falls back to the neutral unknown theme for unmapped categories', () => {
    const fallback = getTheme('unknown', true);
    expect(getTheme('not-a-category' as ConditionCategory, true)).toEqual(fallback);
    expect(getTheme('not-a-category' as ConditionCategory, false)).toEqual(
      getTheme('unknown', false),
    );
  });

  it.each(PAIRS)(
    '%s (day: %s) keeps text readable over every gradient stop (WCAG AA)',
    (condition, isDay) => {
      const theme = getTheme(condition, isDay);
      for (const stop of theme.gradient) {
        expect(contrastRatio(theme.text, stop)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(theme.textSecondary, stop)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(theme.accent, stop)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it.each(PAIRS)(
    '%s (day: %s) picks a status bar style that matches its text colour',
    (condition, isDay) => {
      const theme = getTheme(condition, isDay);
      const lightText = contrastRatio(theme.text, '#000000') > contrastRatio(theme.text, '#ffffff');
      expect(theme.statusBar).toBe(lightText ? 'light' : 'dark');
    },
  );

  it.each(PAIRS)('%s (day: %s) defines a valid ambient effect', (condition, isDay) => {
    const { effect } = getTheme(condition, isDay);
    expect(['none', 'clouds', 'rain', 'snow', 'fog', 'stars']).toContain(effect.kind);
    expect(effect.intensity).toBeGreaterThanOrEqual(0);
    expect(effect.intensity).toBeLessThanOrEqual(1);
  });

  it('animates the weather that visibly moves', () => {
    expect(getTheme('clear', true).effect.kind).toBe('none');
    expect(getTheme('rain', true).effect.kind).toBe('rain');
    expect(getTheme('thunderstorm', false).effect.kind).toBe('rain');
    expect(getTheme('snow', true).effect.kind).toBe('snow');
    expect(getTheme('cloudy', true).effect.kind).toBe('clouds');
    expect(getTheme('mist-fog', true).effect.kind).toBe('fog');
  });

  it('keeps tile text readable on its tile and its accent visible (WCAG AA)', () => {
    for (const [condition, isDay] of PAIRS) {
      const { tile } = getTheme(condition, isDay);
      expect(contrastRatio(tile.text, tile.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tile.textSecondary, tile.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tile.accent, tile.background)).toBeGreaterThanOrEqual(3);
    }
  });

  it('puts stars in the clear night sky only', () => {
    expect(getTheme('clear', false).effect.kind).toBe('stars');
    expect(getTheme('clear', true).effect.kind).toBe('none');
    expect(getTheme('rain', false).effect.kind).toBe('rain');
  });

  it('is heavier for storms than for drizzle', () => {
    expect(getTheme('thunderstorm', true).effect.intensity).toBeGreaterThan(
      getTheme('drizzle', true).effect.intensity,
    );
  });

  it('returns the same object for the same inputs (cheap to call every render)', () => {
    expect(getTheme('rain', false)).toBe(getTheme('rain', false));
  });

  it('exposes a stable key per theme for diffing and testing', () => {
    expect(getTheme('rain', false).key).toBe('rain-night');
    expect(getTheme('clear', true).key).toBe('clear-day');
  });
});
