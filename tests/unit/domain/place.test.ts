import {
  CURRENT_PLACE_ID,
  isValidLatitude,
  isValidLongitude,
  isValidPlace,
  placeIdFor,
  roundCoordinate,
} from '@/domain/place';

describe('place helpers', () => {
  it('uses "current" for the device location id', () => {
    expect(CURRENT_PLACE_ID).toBe('current');
  });

  it('rounds coordinates to 2 decimals', () => {
    expect(roundCoordinate(48.85661)).toBe(48.86);
    expect(roundCoordinate(-2.3522)).toBe(-2.35);
  });

  it('builds ids as "<lat>,<lon>" rounded to 2 decimals', () => {
    expect(placeIdFor(48.85661, 2.35222)).toBe('48.86,2.35');
    expect(placeIdFor(-33.8688, 151.2093)).toBe('-33.87,151.21');
    expect(placeIdFor(10, 20)).toBe('10.00,20.00');
  });

  it('validates latitude -90..90 and longitude -180..180', () => {
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90.01)).toBe(false);
    expect(isValidLatitude(NaN)).toBe(false);
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180.5)).toBe(false);
    expect(isValidLongitude(Infinity)).toBe(false);
  });

  it('requires a non-empty name and valid coordinates', () => {
    expect(isValidPlace({ name: 'Paris', lat: 48.86, lon: 2.35 })).toBe(true);
    expect(isValidPlace({ name: '  ', lat: 48.86, lon: 2.35 })).toBe(false);
    expect(isValidPlace({ name: 'Paris', lat: 100, lon: 2.35 })).toBe(false);
    expect(isValidPlace({ name: 'Paris', lat: 48.86, lon: 200 })).toBe(false);
  });
});
