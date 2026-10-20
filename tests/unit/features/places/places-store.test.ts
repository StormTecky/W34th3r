import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/data/storage';
import { createPlacesStore, isSaved } from '@/features/places/places-store';

import { makePlace, PARIS, SYDNEY, TOKYO } from '../../../helpers/places';

beforeEach(() => {
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

async function hydrated() {
  const store = createPlacesStore();
  await store.hydrate();
  return store;
}

const names = (store: Awaited<ReturnType<typeof hydrated>>) =>
  store.getSnapshot().places.map((place) => place.name);

describe('hydration', () => {
  it('starts empty and not ready, then becomes ready', async () => {
    const store = createPlacesStore();
    expect(store.getSnapshot()).toEqual({ places: [], viewed: null, ready: false });
    await store.hydrate();
    expect(store.getSnapshot().ready).toBe(true);
    expect(store.getSnapshot().places).toEqual([]);
  });

  it('falls back to an empty list when storage is corrupt', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.places, '{{{{');
    expect((await hydrated()).getSnapshot().places).toEqual([]);
  });

  it('drops invalid and duplicate stored entries individually and renumbers the rest', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.places,
      JSON.stringify({
        version: 1,
        places: [
          { ...PARIS, sortOrder: 0 },
          { ...TOKYO, lat: 500, sortOrder: 1 },
          { ...PARIS, name: 'Paris again', sortOrder: 2 },
          { name: 'no coordinates' },
          { ...SYDNEY, sortOrder: 4 },
        ],
      }),
    );
    const store = await hydrated();
    expect(names(store)).toEqual(['Paris', 'Sydney']);
    expect(store.getSnapshot().places.map((p) => p.sortOrder)).toEqual([0, 1]);
  });

  it('drops a stored current-location entry (it is never persisted)', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.places,
      JSON.stringify({
        version: 1,
        places: [{ ...PARIS, kind: 'current-location', id: 'current' }],
      }),
    );
    expect((await hydrated()).getSnapshot().places).toEqual([]);
  });
});

describe('add', () => {
  it('saves a place as kind "saved" with the next sort order', async () => {
    const store = await hydrated();
    await expect(store.add(PARIS)).resolves.toBe(true);
    await expect(store.add(TOKYO)).resolves.toBe(true);
    const { places } = store.getSnapshot();
    expect(places.map((p) => [p.name, p.kind, p.sortOrder])).toEqual([
      ['Paris', 'saved', 0],
      ['Tokyo', 'saved', 1],
    ]);
  });

  it('treats saving an already-saved id as a no-op (no two saved places share an id)', async () => {
    const store = await hydrated();
    await store.add(PARIS);
    await expect(store.add({ ...PARIS, name: 'Paris (copy)' })).resolves.toBe(false);
    expect(names(store)).toEqual(['Paris']);
  });

  it.each([
    ['an empty name', makePlace({ name: '' })],
    ['a whitespace-only name', makePlace({ name: '   ' })],
    ['latitude above 90', makePlace({ lat: 90.5, id: 'x1' })],
    ['latitude below -90', makePlace({ lat: -91, id: 'x2' })],
    ['longitude above 180', makePlace({ lon: 181, id: 'x3' })],
    ['longitude below -180', makePlace({ lon: -180.5, id: 'x4' })],
    ['NaN coordinates', makePlace({ lat: NaN, id: 'x5' })],
  ])('rejects a place with %s', async (_label, place) => {
    const store = await hydrated();
    await expect(store.add(place)).resolves.toBe(false);
    expect(store.getSnapshot().places).toEqual([]);
  });

  it('never persists the current-location place', async () => {
    const store = await hydrated();
    await expect(store.add({ ...PARIS, kind: 'current-location' })).resolves.toBe(false);
    await expect(store.add({ ...PARIS, id: 'current' })).resolves.toBe(false);
    expect(store.getSnapshot().places).toEqual([]);
  });

  it('accepts coordinates exactly on the limits', async () => {
    const store = await hydrated();
    await expect(store.add(makePlace({ name: 'Pole', lat: -90, lon: 180 }))).resolves.toBe(true);
  });

  it('supports 50 or more places and keeps their order', async () => {
    const store = await hydrated();
    for (let i = 0; i < 60; i++) {
      await store.add(makePlace({ name: `Place ${i}`, lat: -80 + i, lon: -170 + i * 5 }));
    }
    expect(store.getSnapshot().places).toHaveLength(60);
    expect(names(await rehydrated())).toEqual(names(store));
  });
});

async function rehydrated() {
  return hydrated();
}

describe('remove', () => {
  it('removes a place and renumbers the sort order without gaps', async () => {
    const store = await hydrated();
    for (const place of [PARIS, TOKYO, SYDNEY]) await store.add(place);
    await store.remove(TOKYO.id);
    expect(store.getSnapshot().places.map((p) => [p.name, p.sortOrder])).toEqual([
      ['Paris', 0],
      ['Sydney', 1],
    ]);
  });

  it('ignores an unknown id', async () => {
    const store = await hydrated();
    await store.add(PARIS);
    await store.remove('nope');
    expect(names(store)).toEqual(['Paris']);
  });
});

describe('move', () => {
  async function three() {
    const store = await hydrated();
    for (const place of [PARIS, TOKYO, SYDNEY]) await store.add(place);
    return store;
  }

  it('moves a place up and down and keeps sort orders contiguous', async () => {
    const store = await three();
    await store.move(TOKYO.id, 'up');
    expect(names(store)).toEqual(['Tokyo', 'Paris', 'Sydney']);
    await store.move(TOKYO.id, 'down');
    await store.move(TOKYO.id, 'down');
    expect(names(store)).toEqual(['Paris', 'Sydney', 'Tokyo']);
    expect(store.getSnapshot().places.map((p) => p.sortOrder)).toEqual([0, 1, 2]);
  });

  it('does nothing when moving the first place up or the last place down', async () => {
    const store = await three();
    await store.move(PARIS.id, 'up');
    await store.move(SYDNEY.id, 'down');
    expect(names(store)).toEqual(['Paris', 'Tokyo', 'Sydney']);
  });

  it('ignores an unknown id', async () => {
    const store = await three();
    await store.move('nope', 'up');
    expect(names(store)).toEqual(['Paris', 'Tokyo', 'Sydney']);
  });
});

describe('persistence', () => {
  it('writes a version 1 document to w34th3r:places', async () => {
    const store = await hydrated();
    await store.add(PARIS);
    const raw = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.places))!);
    expect(raw.version).toBe(1);
    expect(raw.places).toHaveLength(1);
    expect(raw.places[0]).toMatchObject({ id: PARIS.id, name: 'Paris', sortOrder: 0 });
  });

  it('restores places in order after a restart', async () => {
    const first = await hydrated();
    for (const place of [PARIS, TOKYO, SYDNEY]) await first.add(place);
    await first.move(SYDNEY.id, 'up');
    expect(names(await rehydrated())).toEqual(['Paris', 'Sydney', 'Tokyo']);
  });

  it('keeps in-memory state when a write fails', async () => {
    const store = await hydrated();
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    await expect(store.add(PARIS)).resolves.toBe(true);
    expect(names(store)).toEqual(['Paris']);
  });
});

describe('viewed place', () => {
  it('remembers the place being viewed (saved or not) across restarts', async () => {
    const store = await hydrated();
    await store.setViewed(TOKYO);
    expect(store.getSnapshot().viewed).toEqual(expect.objectContaining({ id: TOKYO.id }));
    expect((await rehydrated()).getSnapshot().viewed?.name).toBe('Tokyo');
    expect(store.getSnapshot().places).toEqual([]);
  });

  it('clears the viewed place', async () => {
    const store = await hydrated();
    await store.setViewed(TOKYO);
    await store.setViewed(null);
    expect((await rehydrated()).getSnapshot().viewed).toBeNull();
  });

  it('refuses an invalid viewed place', async () => {
    const store = await hydrated();
    await store.setViewed(makePlace({ lat: 999, id: 'bad' }));
    expect(store.getSnapshot().viewed).toBeNull();
  });
});

describe('subscriptions and helpers', () => {
  it('notifies subscribers on changes, with a stable snapshot between them', async () => {
    const store = await hydrated();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    await store.add(PARIS);
    expect(listener).toHaveBeenCalled();
    expect(store.getSnapshot()).not.toBe(before);
    const calls = listener.mock.calls.length;
    unsubscribe();
    await store.add(TOKYO);
    expect(listener.mock.calls.length).toBe(calls);
  });

  it('isSaved reports whether an id is in the list', async () => {
    const store = await hydrated();
    await store.add(PARIS);
    expect(isSaved(store.getSnapshot(), PARIS.id)).toBe(true);
    expect(isSaved(store.getSnapshot(), TOKYO.id)).toBe(false);
  });
});
