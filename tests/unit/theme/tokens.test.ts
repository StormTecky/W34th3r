import { contrastRatio } from '@/theme/contrast';
import { alertColors, colors, motion, radii, spacing, touch, typography } from '@/theme/tokens';

describe('contrastRatio', () => {
  it('is 21 for black on white and 1 for identical colours', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('is symmetric and accepts short hex and uppercase', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(contrastRatio('#000000', '#FFFFFF'), 5);
  });

  it('throws on a colour it cannot parse', () => {
    expect(() => contrastRatio('red', '#000')).toThrow();
  });
});

describe.each(['light', 'dark'] as const)('%s palette (WCAG 2.2 AA)', (scheme) => {
  const c = colors[scheme];

  it('has AA body-text contrast for primary text on background and surfaces', () => {
    expect(contrastRatio(c.text, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.text, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.text, c.surfaceRaised)).toBeGreaterThanOrEqual(4.5);
  });

  it('has AA contrast for secondary text', () => {
    expect(contrastRatio(c.textSecondary, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.textSecondary, c.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('has AA contrast for accent used as text and for text on accent fills', () => {
    expect(contrastRatio(c.accent, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.onAccent, c.accentFill)).toBeGreaterThanOrEqual(4.5);
  });

  it('has AA contrast for the danger colour used as text', () => {
    expect(contrastRatio(c.danger, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(c.danger, c.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('has 3:1 contrast for meaningful graphics (borders of controls)', () => {
    expect(contrastRatio(c.controlBorder, c.background)).toBeGreaterThanOrEqual(3);
  });
});

describe('scales', () => {
  it('has a strictly increasing spacing scale', () => {
    const values = Object.values(spacing);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(new Set(values).size).toBe(values.length);
  });

  it('has a strictly increasing radius scale ending in a pill', () => {
    const { pill, ...scale } = radii;
    const values = Object.values(scale);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
    expect(pill).toBeGreaterThan(Math.max(...values));
  });

  it('defines every text style with a font family, size and a line height at least the size', () => {
    for (const style of Object.values(typography)) {
      expect(style.fontFamily).toMatch(/^Outfit-/);
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });

  it('orders motion durations fast < base < slow', () => {
    expect(motion.fast).toBeLessThan(motion.base);
    expect(motion.base).toBeLessThan(motion.slow);
  });

  it('requires touch targets of at least 44 points', () => {
    expect(touch.minTarget).toBeGreaterThanOrEqual(44);
  });
});

describe('alertColors', () => {
  it.each(Object.entries(alertColors))(
    'keeps %s alert text readable (WCAG AA)',
    (_severity, pair) => {
      expect(contrastRatio(pair.text, pair.background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('gives every severity a different background', () => {
    const backgrounds = Object.values(alertColors).map((pair) => pair.background);
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });
});
