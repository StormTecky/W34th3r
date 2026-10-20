import { getLocales } from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import type { UserPreferences } from '@/domain/types';

import { createPreferencesStore, type PreferencesStore } from './preferences-store';

function deviceRegionCode(): string | null {
  try {
    return getLocales()[0]?.regionCode ?? null;
  } catch {
    return null;
  }
}

let appStore: PreferencesStore | undefined;

/** The single store used by the running app. Created lazily so tests can inject their own. */
export function getAppPreferencesStore(): PreferencesStore {
  appStore ??= createPreferencesStore({ regionCode: deviceRegionCode() });
  return appStore;
}

const PreferencesContext = createContext<PreferencesStore | null>(null);

export function PreferencesProvider({
  store,
  children,
}: {
  store?: PreferencesStore;
  children: ReactNode;
}) {
  const value = useMemo(() => store ?? getAppPreferencesStore(), [store]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export interface UsePreferencesResult {
  preferences: UserPreferences;
  /** False until stored preferences have loaded. */
  ready: boolean;
  update: (patch: Partial<UserPreferences>) => Promise<void>;
}

export function usePreferences(): UsePreferencesResult {
  const store = useContext(PreferencesContext) ?? getAppPreferencesStore();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const update = useCallback((patch: Partial<UserPreferences>) => store.update(patch), [store]);
  return { preferences: snapshot.preferences, ready: snapshot.ready, update };
}
