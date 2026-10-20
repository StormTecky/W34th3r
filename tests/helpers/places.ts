import { placeIdFor } from '@/domain/place';
import type { Place } from '@/domain/types';

/** A valid saved Place; coordinates and id stay consistent unless overridden. */
export function makePlace(overrides: Partial<Place> = {}): Place {
  const lat = overrides.lat ?? 48.86;
  const lon = overrides.lon ?? 2.35;
  return {
    id: placeIdFor(lat, lon),
    name: 'Paris',
    region: 'Île-de-France',
    country: 'FR',
    lat,
    lon,
    timeZone: null,
    kind: 'saved',
    sortOrder: null,
    ...overrides,
  };
}

export const PARIS = makePlace();
export const TOKYO = makePlace({
  name: 'Tokyo',
  region: 'Tokyo',
  country: 'JP',
  lat: 35.68,
  lon: 139.69,
});
export const SYDNEY = makePlace({
  name: 'Sydney',
  region: 'New South Wales',
  country: 'AU',
  lat: -33.87,
  lon: 151.21,
});
