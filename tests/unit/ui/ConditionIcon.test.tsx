import { render, screen } from '@testing-library/react-native';

import { CONDITION_CATEGORIES } from '@/domain/types';
import { ConditionIcon, iconNameFor } from '@/ui/ConditionIcon';

describe('iconNameFor', () => {
  it('distinguishes day from night for clear and partly cloudy skies', () => {
    expect(iconNameFor('clear', true)).toBe('sun');
    expect(iconNameFor('clear', false)).toBe('moon');
    expect(iconNameFor('partly-cloudy', true)).toBe('sun-cloud');
    expect(iconNameFor('partly-cloudy', false)).toBe('moon-cloud');
  });

  it('uses the same icon day and night for weather that hides the sky', () => {
    for (const condition of ['cloudy', 'rain', 'snow', 'thunderstorm', 'mist-fog'] as const) {
      expect(iconNameFor(condition, true)).toBe(iconNameFor(condition, false));
    }
  });

  it('gives every category an icon, with a fallback for unknown', () => {
    for (const condition of CONDITION_CATEGORIES) {
      expect(iconNameFor(condition, true)).toBeTruthy();
    }
    expect(iconNameFor('unknown', true)).toBe('unknown');
  });

  it('keeps visually distinct icons for the precipitation types', () => {
    const names = (['drizzle', 'rain', 'snow', 'sleet', 'thunderstorm'] as const).map((c) =>
      iconNameFor(c, true),
    );
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('ConditionIcon', () => {
  it.each(CONDITION_CATEGORIES.flatMap((c) => [[c, true] as const, [c, false] as const]))(
    'renders %s (day: %s) without error',
    async (condition, isDay) => {
      await render(<ConditionIcon condition={condition} isDay={isDay} color="#000000" />);
      expect(
        screen.getByTestId(`condition-icon-${iconNameFor(condition, isDay)}`, {
          includeHiddenElements: true,
        }),
      ).toBeTruthy();
    },
  );

  it('is hidden from screen readers (the text beside it carries the meaning)', async () => {
    await render(<ConditionIcon condition="rain" isDay color="#000" />);
    const icon = screen.getByTestId('condition-icon-rain', { includeHiddenElements: true });
    expect(icon.props.importantForAccessibility).toBe('no-hide-descendants');
  });
});
