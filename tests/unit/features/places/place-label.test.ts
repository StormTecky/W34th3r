import { placeLabel, placeSubtitle } from '@/features/places/place-label';

describe('placeLabel', () => {
  it('joins name, region and country', () => {
    expect(placeLabel({ name: 'Springfield', region: 'Illinois', country: 'US' })).toBe(
      'Springfield, Illinois, US',
    );
  });

  it('skips a missing region or country', () => {
    expect(placeLabel({ name: 'Springfield', region: null, country: 'ZA' })).toBe(
      'Springfield, ZA',
    );
    expect(placeLabel({ name: 'Nowhere', region: null, country: '' })).toBe('Nowhere');
  });

  it('keeps non-Latin names', () => {
    expect(placeLabel({ name: 'Москва', region: 'Moscow', country: 'RU' })).toBe(
      'Москва, Moscow, RU',
    );
  });
});

describe('placeSubtitle', () => {
  it('gives the region and country without the name', () => {
    expect(placeSubtitle({ region: 'Illinois', country: 'US' })).toBe('Illinois, US');
    expect(placeSubtitle({ region: null, country: 'ZA' })).toBe('ZA');
    expect(placeSubtitle({ region: null, country: '' })).toBe('');
  });
});
