import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import type { Place } from '@/domain/types';

import { createPlacesStore, isSaved, type PlacesStore } from './places-store';

let appStore: PlacesStore | undefined;

/** The single store used by the running app. Created lazily so tests can inject their own. */
export function getAppPlacesStore(): PlacesStore {
  appStore ??= createPlacesStore();
  return appStore;
}

const PlacesContext = createContext<PlacesStore | null>(null);

export function PlacesProvider({ store, children }: { store?: PlacesStore; children: ReactNode }) {
  const value = useMemo(() => store ?? getAppPlacesStore(), [store]);
  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export interface UsePlacesResult {
  places: Place[];
  viewed: Place | null;
  /** False until stored places have loaded. */
  ready: boolean;
  isSaved: (id: string) => boolean;
  add: (place: Place) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  move: (id: string, direction: 'up' | 'down') => Promise<void>;
  setViewed: (place: Place | null) => Promise<void>;
}

export function usePlaces(): UsePlacesResult {
  const store = useContext(PlacesContext) ?? getAppPlacesStore();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const saved = useCallback((id: string) => isSaved(snapshot, id), [snapshot]);
  return {
    places: snapshot.places,
    viewed: snapshot.viewed,
    ready: snapshot.ready,
    isSaved: saved,
    add: store.add,
    remove: store.remove,
    move: store.move,
    setViewed: store.setViewed,
  };
}
