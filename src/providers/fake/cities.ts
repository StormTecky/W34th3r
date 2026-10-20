import { placeIdFor } from '@/domain/place';
import type { Place } from '@/domain/types';

export interface FakeCity {
  name: string;
  region: string | null;
  country: string;
  lat: number;
  lon: number;
  timeZone: string;
  /** Extra lowercase search terms, e.g. a Latin spelling for a non-Latin name. */
  aliases?: string[];
}

/** Cities known to the fake provider, covering many zones, DST rules, and the date line. */
export const FAKE_CITIES: readonly FakeCity[] = [
  {
    name: 'Paris',
    region: 'Île-de-France',
    country: 'FR',
    lat: 48.86,
    lon: 2.35,
    timeZone: 'Europe/Paris',
  },
  {
    name: 'London',
    region: 'England',
    country: 'GB',
    lat: 51.51,
    lon: -0.13,
    timeZone: 'Europe/London',
  },
  {
    name: 'New York',
    region: 'New York',
    country: 'US',
    lat: 40.71,
    lon: -74.01,
    timeZone: 'America/New_York',
  },
  {
    name: 'Springfield',
    region: 'Illinois',
    country: 'US',
    lat: 39.8,
    lon: -89.64,
    timeZone: 'America/Chicago',
  },
  {
    name: 'Springfield',
    region: 'Massachusetts',
    country: 'US',
    lat: 42.1,
    lon: -72.59,
    timeZone: 'America/New_York',
  },
  {
    name: 'Springfield',
    region: 'Missouri',
    country: 'US',
    lat: 37.21,
    lon: -93.29,
    timeZone: 'America/Chicago',
  },
  {
    name: 'Tokyo',
    region: 'Tokyo',
    country: 'JP',
    lat: 35.68,
    lon: 139.69,
    timeZone: 'Asia/Tokyo',
  },
  {
    name: 'Sydney',
    region: 'New South Wales',
    country: 'AU',
    lat: -33.87,
    lon: 151.21,
    timeZone: 'Australia/Sydney',
  },
  {
    name: 'Kolkata',
    region: 'West Bengal',
    country: 'IN',
    lat: 22.57,
    lon: 88.36,
    timeZone: 'Asia/Kolkata',
  },
  {
    name: 'Anchorage',
    region: 'Alaska',
    country: 'US',
    lat: 61.22,
    lon: -149.9,
    timeZone: 'America/Anchorage',
  },
  {
    name: 'Kiritimati',
    region: null,
    country: 'KI',
    lat: 1.87,
    lon: -157.4,
    timeZone: 'Pacific/Kiritimati',
  },
  {
    name: 'Pago Pago',
    region: null,
    country: 'AS',
    lat: -14.28,
    lon: -170.7,
    timeZone: 'Pacific/Pago_Pago',
  },
  {
    name: 'Reykjavík',
    region: null,
    country: 'IS',
    lat: 64.15,
    lon: -21.94,
    timeZone: 'Atlantic/Reykjavik',
    aliases: ['reykjavik'],
  },
  {
    name: 'Москва',
    region: null,
    country: 'RU',
    lat: 55.76,
    lon: 37.62,
    timeZone: 'Europe/Moscow',
    aliases: ['moscow', 'moskva'],
  },
];

export function cityToPlace(city: FakeCity, kind: Place['kind'] = 'saved'): Place {
  return {
    id: kind === 'current-location' ? 'current' : placeIdFor(city.lat, city.lon),
    name: city.name,
    region: city.region,
    country: city.country,
    lat: city.lat,
    lon: city.lon,
    timeZone: city.timeZone,
    kind,
    sortOrder: null,
  };
}

/** Largest distance, in degrees, at which a coordinate still counts as "in" a fake city. */
export const CITY_RADIUS_DEGREES = 2;

/** The nearest fake city within CITY_RADIUS_DEGREES, so device coordinates map to a time zone. */
export function findCityForPlace(place: { lat: number; lon: number }): FakeCity | undefined {
  const ranked = FAKE_CITIES.map((city) => ({
    city,
    distance: Math.hypot(city.lat - place.lat, city.lon - place.lon),
  })).sort((a, b) => a.distance - b.distance);
  const nearest = ranked[0];
  return nearest && nearest.distance <= CITY_RADIUS_DEGREES ? nearest.city : undefined;
}
