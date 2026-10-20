import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

import { STORAGE_KEYS } from './storage';

/** Persists the TanStack Query cache to AsyncStorage under `w34th3r:query-cache`. */
export function createStoragePersister() {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: STORAGE_KEYS.queryCache,
    throttleTime: 1000,
  });
}
