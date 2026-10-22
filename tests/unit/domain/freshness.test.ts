import { ageSeconds, formatAge, freshnessOf, STALE_AFTER_SECONDS } from '@/domain/freshness';

const FETCHED = 1_800_000_000;

describe('freshnessOf', () => {
  it('uses a 15 minute window', () => {
    expect(STALE_AFTER_SECONDS).toBe(15 * 60);
  });

  it('is fresh when the age is at most 15 minutes, including exactly 15', () => {
    expect(freshnessOf(FETCHED, FETCHED)).toBe('fresh');
    expect(freshnessOf(FETCHED, FETCHED + 14 * 60 + 59)).toBe('fresh');
    expect(freshnessOf(FETCHED, FETCHED + 15 * 60)).toBe('fresh');
  });

  it('is stale when the age is more than 15 minutes', () => {
    expect(freshnessOf(FETCHED, FETCHED + 15 * 60 + 1)).toBe('stale');
    expect(freshnessOf(FETCHED, FETCHED + 24 * 3600)).toBe('stale');
  });

  it('treats a fetch time in the future (clock skew) as fresh with zero age', () => {
    expect(ageSeconds(FETCHED, FETCHED - 100)).toBe(0);
    expect(freshnessOf(FETCHED, FETCHED - 100)).toBe('fresh');
  });
});

describe('formatAge', () => {
  it.each([
    [0, 'Updated just now'],
    [59, 'Updated just now'],
    [60, 'Updated 1 min ago'],
    [5 * 60 + 30, 'Updated 5 min ago'],
    [59 * 60, 'Updated 59 min ago'],
    [3600, 'Updated 1 h ago'],
    [3 * 3600 + 1200, 'Updated 3 h ago'],
    [23 * 3600 + 3599, 'Updated 23 h ago'],
    [86_400, 'Updated 1 d ago'],
    [3 * 86_400 + 5000, 'Updated 3 d ago'],
  ])('after %i seconds says "%s"', (age, expected) => {
    expect(formatAge(FETCHED, FETCHED + age)).toBe(expected);
  });
});

describe('formatAge in French', () => {
  it.each([
    [0, "Mis à jour à l'instant"],
    [59, "Mis à jour à l'instant"],
    [60, 'Mis à jour il y a 1 min'],
    [5 * 60 + 30, 'Mis à jour il y a 5 min'],
    [3600, 'Mis à jour il y a 1 h'],
    [3 * 3600 + 1200, 'Mis à jour il y a 3 h'],
    [86_400, 'Mis à jour il y a 1 j'],
    [3 * 86_400 + 5000, 'Mis à jour il y a 3 j'],
  ])('after %i seconds says "%s"', (age, expected) => {
    expect(formatAge(FETCHED, FETCHED + age, 'fr-FR')).toBe(expected);
  });

  it('uses English for a language the app does not translate', () => {
    expect(formatAge(FETCHED, FETCHED + 300, 'de-DE')).toBe('Updated 5 min ago');
  });
});
