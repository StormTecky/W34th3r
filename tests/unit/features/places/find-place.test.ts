import { findPlace } from '@/features/places/find-place';

import { PARIS, SYDNEY, TOKYO } from '../../../helpers/places';

describe('findPlace', () => {
  it('finds a saved place by id', () => {
    expect(findPlace(TOKYO.id, [PARIS, TOKYO], null)).toBe(TOKYO);
  });

  it('falls back to the viewed place, which need not be saved', () => {
    expect(findPlace(SYDNEY.id, [PARIS], SYDNEY)).toBe(SYDNEY);
  });

  it('prefers the saved copy over the viewed one', () => {
    const saved = { ...SYDNEY, name: 'Saved' };
    expect(findPlace(SYDNEY.id, [saved], SYDNEY)).toBe(saved);
  });

  it('returns null for the current location and for unknown ids', () => {
    expect(findPlace('current', [PARIS], PARIS)).toBeNull();
    expect(findPlace('nope', [PARIS], TOKYO)).toBeNull();
  });
});
