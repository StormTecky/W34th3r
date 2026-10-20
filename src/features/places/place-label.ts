import type { Place } from '@/domain/types';

/** "Springfield, Illinois, US": enough to tell same-named places apart. */
export function placeLabel(place: Pick<Place, 'name' | 'region' | 'country'>): string {
  return [place.name, place.region, place.country]
    .filter((part) => part && part.length > 0)
    .join(', ');
}

/** The secondary line under a place name: "Illinois, US". */
export function placeSubtitle(place: Pick<Place, 'region' | 'country'>): string {
  return [place.region, place.country].filter((part) => part && part.length > 0).join(', ');
}
