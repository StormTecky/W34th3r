import { moodLine } from '@/domain/mood';
import { CONDITION_CATEGORIES } from '@/domain/types';

describe('moodLine', () => {
  it('gives every condition, day and night, a non-empty line', () => {
    for (const condition of CONDITION_CATEGORIES) {
      for (const isDay of [true, false]) {
        expect(moodLine(condition, isDay, 15).length).toBeGreaterThan(3);
      }
    }
  });

  it('is cheerful for a warm clear day and different for a cool one', () => {
    expect(moodLine('clear', true, 22)).toBe("Sun's out. Go play!");
    expect(moodLine('clear', true, 8)).toBe('Crisp and bright out there.');
  });

  it('looks up at clear nights', () => {
    expect(moodLine('clear', false, 12)).toBe('Clear skies. Look up!');
  });

  it('reacts to extreme temperatures whatever the sky is doing', () => {
    expect(moodLine('clear', true, 38)).toBe('Scorcher. Stay hydrated!');
    expect(moodLine('snow', true, -20)).toBe('Brr. Seriously cold out.');
    expect(moodLine('rain', true, 35)).toBe('Scorcher. Stay hydrated!');
  });

  it('has a line for each kind of precipitation', () => {
    const lines = (['drizzle', 'rain', 'thunderstorm', 'snow', 'sleet'] as const).map((c) =>
      moodLine(c, true, 5),
    );
    expect(new Set(lines).size).toBe(5);
  });

  it('falls back to a generic line for unknown weather', () => {
    expect(moodLine('unknown', true, 10)).toBe('Weather is weathering.');
  });
});
