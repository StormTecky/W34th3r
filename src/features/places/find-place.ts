import { CURRENT_PLACE_ID } from '@/domain/place';
import type { Place } from '@/domain/types';

/**
 * The saved or recently viewed place with this id. Null for the current location (which has no
 * stored Place) and for unknown ids.
 */
export function findPlace(id: string, saved: readonly Place[], viewed: Place | null): Place | null {
  if (id === CURRENT_PLACE_ID) return null;
  return saved.find((place) => place.id === id) ?? (viewed?.id === id ? viewed : null);
}
