import { CONDITION_CATEGORIES, type ConditionCategory } from '@/domain/types';
import { sceneFor } from '@/theme/scenes/scene-name';

describe('sceneFor', () => {
  it('draws a sun by day and a moon by night for clear skies', () => {
    expect(sceneFor('clear', true)).toBe('sun');
    expect(sceneFor('clear', false)).toBe('moon');
    expect(sceneFor('partly-cloudy', true)).toBe('sun-cloud');
    expect(sceneFor('partly-cloudy', false)).toBe('moon-cloud');
  });

  it('uses the same scene day and night where the sky is hidden', () => {
    for (const c of ['cloudy', 'rain', 'snow', 'thunderstorm', 'mist-fog'] as const) {
      expect(sceneFor(c, true)).toBe(sceneFor(c, false));
    }
  });

  it('gives every condition a scene, with a fallback for unmapped ones', () => {
    for (const c of CONDITION_CATEGORIES) expect(sceneFor(c, true)).toBeTruthy();
    expect(sceneFor('nope' as ConditionCategory, true)).toBe('unknown');
  });

  it('keeps the precipitation scenes distinct', () => {
    const names = (['drizzle', 'rain', 'thunderstorm', 'snow', 'sleet'] as const).map((c) =>
      sceneFor(c, true),
    );
    expect(new Set(names).size).toBe(5);
  });
});
