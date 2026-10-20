import type { Place } from './types';

export const CURRENT_PLACE_ID = 'current';

/** Coordinates are rounded to 2 decimals before leaving the device and when used as keys. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

export function placeIdFor(lat: number, lon: number): string {
  return `${roundCoordinate(lat).toFixed(2)},${roundCoordinate(lon).toFixed(2)}`;
}

export function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

export function isValidLongitude(lon: number): boolean {
  return Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

/** A place is valid when lat is -90..90, lon is -180..180, and the name is non-empty. */
export function isValidPlace(place: Pick<Place, 'name' | 'lat' | 'lon'>): boolean {
  return place.name.trim().length > 0 && isValidLatitude(place.lat) && isValidLongitude(place.lon);
}
