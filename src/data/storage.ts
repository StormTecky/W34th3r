import AsyncStorage from '@react-native-async-storage/async-storage';

import { log } from '@/lib/logger';

/** Every key is namespaced `w34th3r:` (see contracts/local-storage.md). */
export const STORAGE_KEYS = {
  prefs: 'w34th3r:prefs',
  places: 'w34th3r:places',
  queryCache: 'w34th3r:query-cache',
} as const;

export interface ReadOptions<T> {
  /** Current schema version of the document. */
  version: number;
  /** Fresh default used when nothing valid is stored. */
  fallback: () => T;
  /** Returns the typed document, or null when the stored shape is not acceptable. */
  validate: (data: unknown) => T | null;
  /** Upgrades data written by an older version; null means it cannot be migrated. */
  migrate?: (data: unknown, fromVersion: number) => T | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function discard(storageKey: string, reason: string): Promise<void> {
  // Never log the stored content or the parser's message: either may contain personal data.
  log.warn('Discarding unreadable stored document', { storageKey, reason });
  try {
    await AsyncStorage.removeItem(storageKey);
  } catch {
    // Nothing more to do; the next write will replace it.
  }
}

/**
 * Reads a versioned document. Missing, corrupt, invalid, or incompatible data yields the fallback;
 * this function never throws.
 */
export async function readDocument<T>(storageKey: string, options: ReadOptions<T>): Promise<T> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(storageKey);
  } catch {
    log.warn('Storage read failed', { storageKey });
    return options.fallback();
  }
  if (raw === null) return options.fallback();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    await discard(storageKey, 'corrupt-json');
    return options.fallback();
  }
  if (!isPlainObject(parsed) || typeof parsed.version !== 'number') {
    await discard(storageKey, 'unexpected-shape');
    return options.fallback();
  }

  const { version: storedVersion, ...data } = parsed;
  let document: T | null = null;
  if (storedVersion === options.version) {
    document = options.validate(data);
  } else if (storedVersion < options.version && options.migrate) {
    document = options.migrate(data, storedVersion);
  } else {
    // Older without a migration, or written by a newer app version: use defaults, keep the data.
    return options.fallback();
  }

  if (document === null) {
    await discard(storageKey, 'invalid-document');
    return options.fallback();
  }
  return document;
}

/** Writes the whole document. Returns false (after logging) if the write failed. */
export async function writeDocument<T extends object>(
  storageKey: string,
  version: number,
  document: T,
): Promise<boolean> {
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify({ ...document, version }));
    return true;
  } catch {
    log.warn('Storage write failed', { storageKey });
    return false;
  }
}
