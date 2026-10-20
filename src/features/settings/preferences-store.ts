import { readDocument, STORAGE_KEYS, writeDocument } from '@/data/storage';
import { CURRENT_PLACE_ID } from '@/domain/place';
import type {
  Appearance,
  PrecipitationUnit,
  TemperatureUnit,
  UserPreferences,
  WindSpeedUnit,
} from '@/domain/types';
import { defaultUnitsForRegion } from '@/domain/units';

export const PREFERENCES_VERSION = 1;

export const TEMPERATURE_UNITS: readonly TemperatureUnit[] = ['c', 'f'];
export const WIND_SPEED_UNITS: readonly WindSpeedUnit[] = ['ms', 'kmh', 'mph', 'kn'];
export const PRECIPITATION_UNITS: readonly PrecipitationUnit[] = ['mm', 'in'];
export const APPEARANCES: readonly Appearance[] = ['system', 'light', 'dark'];

export interface PreferencesSnapshot {
  preferences: UserPreferences;
  /** False until stored preferences have been loaded. */
  ready: boolean;
}

export interface PreferencesStore {
  /** Stable between changes, as required by React's useSyncExternalStore. */
  getSnapshot(): PreferencesSnapshot;
  getState(): UserPreferences;
  isReady(): boolean;
  subscribe(listener: () => void): () => void;
  hydrate(): Promise<void>;
  update(patch: Partial<UserPreferences>): Promise<void>;
}

export function defaultPreferences(regionCode: string | null | undefined): UserPreferences {
  return {
    ...defaultUnitsForRegion(regionCode),
    appearance: 'system',
    lastViewedPlaceId: CURRENT_PLACE_ID,
    hasSeenLocationPrompt: false,
  };
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

/** Keeps only the stored fields that are individually valid. */
function validPartial(data: unknown): Partial<UserPreferences> {
  const raw = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const partial: Partial<UserPreferences> = {};
  const temperatureUnit = oneOf(TEMPERATURE_UNITS, raw.temperatureUnit);
  const windSpeedUnit = oneOf(WIND_SPEED_UNITS, raw.windSpeedUnit);
  const precipitationUnit = oneOf(PRECIPITATION_UNITS, raw.precipitationUnit);
  const appearance = oneOf(APPEARANCES, raw.appearance);
  if (temperatureUnit) partial.temperatureUnit = temperatureUnit;
  if (windSpeedUnit) partial.windSpeedUnit = windSpeedUnit;
  if (precipitationUnit) partial.precipitationUnit = precipitationUnit;
  if (appearance) partial.appearance = appearance;
  if (typeof raw.lastViewedPlaceId === 'string' && raw.lastViewedPlaceId.length > 0) {
    partial.lastViewedPlaceId = raw.lastViewedPlaceId;
  }
  if (typeof raw.hasSeenLocationPrompt === 'boolean') {
    partial.hasSeenLocationPrompt = raw.hasSeenLocationPrompt;
  }
  return partial;
}

export function createPreferencesStore(options: {
  regionCode: string | null | undefined;
}): PreferencesStore {
  const defaults = defaultPreferences(options.regionCode);
  let snapshot: PreferencesSnapshot = { preferences: defaults, ready: false };
  const listeners = new Set<() => void>();

  const publish = (next: PreferencesSnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: () => snapshot,
    getState: () => snapshot.preferences,
    isReady: () => snapshot.ready,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async hydrate() {
      const stored = await readDocument<Partial<UserPreferences>>(STORAGE_KEYS.prefs, {
        version: PREFERENCES_VERSION,
        fallback: () => ({}),
        validate: validPartial,
      });
      publish({ preferences: { ...defaults, ...stored }, ready: true });
    },
    async update(patch) {
      const preferences = { ...snapshot.preferences, ...patch };
      publish({ ...snapshot, preferences });
      // A failed write is logged by the storage layer; in-memory state stays valid.
      await writeDocument(STORAGE_KEYS.prefs, PREFERENCES_VERSION, preferences);
    },
  };
}
