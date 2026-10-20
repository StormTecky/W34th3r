import AsyncStorage from '@react-native-async-storage/async-storage';

import { readDocument, STORAGE_KEYS, writeDocument } from '@/data/storage';

interface Doc {
  items: string[];
}

const KEY = 'w34th3r:test';
const fallback = (): Doc => ({ items: [] });
const validate = (data: unknown): Doc | null => {
  const items = (data as { items?: unknown } | null)?.items;
  return Array.isArray(items) && items.every((item) => typeof item === 'string')
    ? { items: items as string[] }
    : null;
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'debug').mockImplementation(() => undefined);
});

describe('STORAGE_KEYS', () => {
  it('namespaces every key under w34th3r:', () => {
    for (const key of Object.values(STORAGE_KEYS)) expect(key.startsWith('w34th3r:')).toBe(true);
    expect(STORAGE_KEYS.prefs).toBe('w34th3r:prefs');
    expect(STORAGE_KEYS.places).toBe('w34th3r:places');
    expect(STORAGE_KEYS.queryCache).toBe('w34th3r:query-cache');
  });
});

describe('writeDocument / readDocument', () => {
  it('round-trips a document and stores the version alongside it', async () => {
    await expect(writeDocument(KEY, 1, { items: ['a', 'b'] })).resolves.toBe(true);
    const raw = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(raw).toEqual({ version: 1, items: ['a', 'b'] });
    await expect(readDocument(KEY, { version: 1, fallback, validate })).resolves.toEqual({
      items: ['a', 'b'],
    });
  });

  it('returns the fallback when nothing is stored', async () => {
    await expect(readDocument(KEY, { version: 1, fallback, validate })).resolves.toEqual({
      items: [],
    });
  });

  it('returns a fresh fallback object each time', async () => {
    const a = await readDocument(KEY, { version: 1, fallback, validate });
    const b = await readDocument(KEY, { version: 1, fallback, validate });
    expect(a).not.toBe(b);
  });
});

describe('corrupt or incompatible data', () => {
  it('falls back, discards the entry, and logs without personal content on corrupt JSON', async () => {
    await AsyncStorage.setItem(KEY, '{not json, lat=48.85 "Paris"');
    const result = await readDocument(KEY, { version: 1, fallback, validate });
    expect(result).toEqual({ items: [] });
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    const logged = JSON.stringify((console.warn as jest.Mock).mock.calls);
    expect(logged).toContain(KEY);
    expect(logged).not.toContain('Paris');
    expect(logged).not.toContain('48.85');
  });

  it.each(['42', '"text"', 'null', '[1,2]'])('falls back for non-object JSON %s', async (raw) => {
    await AsyncStorage.setItem(KEY, raw);
    await expect(readDocument(KEY, { version: 1, fallback, validate })).resolves.toEqual({
      items: [],
    });
  });

  it('falls back and discards when validation rejects the shape', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, items: [1, 2] }));
    await expect(readDocument(KEY, { version: 1, fallback, validate })).resolves.toEqual({
      items: [],
    });
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('falls back for an older version without a migration', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, items: ['old'] }));
    await expect(readDocument(KEY, { version: 2, fallback, validate })).resolves.toEqual({
      items: [],
    });
  });

  it('migrates an older version when a migration is provided', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ version: 1, items: ['old'] }));
    const migrate = jest.fn((data: unknown, from: number): Doc | null => {
      const doc = validate(data);
      return doc ? { items: doc.items.map((item) => `${item}-v${from}`) } : null;
    });
    const result = await readDocument(KEY, { version: 2, fallback, validate, migrate });
    expect(result).toEqual({ items: ['old-v1'] });
    expect(migrate).toHaveBeenCalledWith(expect.objectContaining({ items: ['old'] }), 1);
  });

  it('falls back for data written by a newer version (downgrade)', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ version: 9, items: ['future'] }));
    await expect(readDocument(KEY, { version: 1, fallback, validate })).resolves.toEqual({
      items: [],
    });
  });
});

describe('storage failures', () => {
  it('returns the fallback when reading throws', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk gone'));
    await expect(readDocument(KEY, { version: 1, fallback, validate })).resolves.toEqual({
      items: [],
    });
  });

  it('reports a failed write as false without throwing', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(writeDocument(KEY, 1, { items: ['a'] })).resolves.toBe(false);
    expect(console.warn).toHaveBeenCalled();
  });
});
