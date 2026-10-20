import { readDocument, STORAGE_KEYS, writeDocument } from '@/data/storage';
import { CURRENT_PLACE_ID, isValidPlace } from '@/domain/place';
import type { Place } from '@/domain/types';

export const PLACES_VERSION = 1;

export interface PlacesSnapshot {
  /** Saved places in display order. The current-location place is never in this list. */
  places: Place[];
  /** The place last opened from search or the list, whether or not it is saved. */
  viewed: Place | null;
  /** False until stored places have been loaded. */
  ready: boolean;
}

export interface PlacesStore {
  /** Stable between changes, as required by React's useSyncExternalStore. */
  getSnapshot(): PlacesSnapshot;
  subscribe(listener: () => void): () => void;
  hydrate(): Promise<void>;
  /** Saves a place. Resolves false if it is invalid, the current location, or already saved. */
  add(place: Place): Promise<boolean>;
  remove(id: string): Promise<void>;
  move(id: string, direction: 'up' | 'down'): Promise<void>;
  setViewed(place: Place | null): Promise<void>;
}

interface StoredPlaces {
  places: Place[];
  viewed: Place | null;
}

export function isSaved(snapshot: PlacesSnapshot, id: string): boolean {
  return snapshot.places.some((place) => place.id === id);
}

const stringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const isSaveableId = (id: unknown): id is string =>
  typeof id === 'string' && id.length > 0 && id !== CURRENT_PLACE_ID;

/** Returns a clean saved-kind copy, or null if the value is not an acceptable place. */
function sanitize(raw: unknown): Place | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { id, name, country, lat, lon, kind, region, timeZone } = raw as Record<string, unknown>;
  if (!isSaveableId(id) || kind === 'current-location') return null;
  if (typeof name !== 'string' || typeof country !== 'string') return null;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!isValidPlace({ name, lat, lon })) return null;
  return {
    id,
    name: name.trim(),
    region: stringOrNull(region),
    country,
    lat,
    lon,
    timeZone: stringOrNull(timeZone),
    kind: 'saved',
    sortOrder: null,
  };
}

const numbered = (places: Place[]): Place[] =>
  places.map((place, index) => ({ ...place, sortOrder: index }));

function parseStored(data: unknown): StoredPlaces | null {
  const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  if (!Array.isArray(record.places)) return null;
  const seen = new Set<string>();
  const places: Place[] = [];
  for (const entry of record.places) {
    const place = sanitize(entry);
    if (place && !seen.has(place.id)) {
      seen.add(place.id);
      places.push(place);
    }
  }
  return { places: numbered(places), viewed: sanitize(record.viewed) };
}

/** The list with `id` moved one step, or null when that move is impossible. */
function moved(places: Place[], id: string, direction: 'up' | 'down'): Place[] | null {
  const from = places.findIndex((place) => place.id === id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= places.length) return null;
  const next = [...places];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return numbered(next);
}

async function loadStored(): Promise<StoredPlaces> {
  return readDocument<StoredPlaces>(STORAGE_KEYS.places, {
    version: PLACES_VERSION,
    fallback: () => ({ places: [], viewed: null }),
    validate: parseStored,
  });
}

export function createPlacesStore(): PlacesStore {
  let snapshot: PlacesSnapshot = { places: [], viewed: null, ready: false };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const publish = async (next: Partial<PlacesSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    notify();
    // A failed write is logged by the storage layer; in-memory state stays valid.
    const { places, viewed } = snapshot;
    await writeDocument(STORAGE_KEYS.places, PLACES_VERSION, { places, viewed });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async hydrate() {
      snapshot = { ...(await loadStored()), ready: true };
      notify();
    },
    async add(place) {
      const clean = sanitize(place);
      if (!clean || isSaved(snapshot, clean.id)) return false;
      await publish({ places: numbered([...snapshot.places, clean]) });
      return true;
    },
    async remove(id) {
      if (!isSaved(snapshot, id)) return;
      await publish({ places: numbered(snapshot.places.filter((place) => place.id !== id)) });
    },
    async move(id, direction) {
      const next = moved(snapshot.places, id, direction);
      if (next) await publish({ places: next });
    },
    async setViewed(place) {
      await publish({ viewed: place === null ? null : sanitize(place) });
    },
  };
}
