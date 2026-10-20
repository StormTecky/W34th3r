import AsyncStorage from '@react-native-async-storage/async-storage';

import { createPreferencesStore } from '@/features/settings/preferences-store';
import { STORAGE_KEYS } from '@/data/storage';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'debug').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

async function hydrated(regionCode: string | null) {
  const store = createPreferencesStore({ regionCode });
  await store.hydrate();
  return store;
}

describe('defaults', () => {
  it('derives units from the device region (US)', async () => {
    const { temperatureUnit, windSpeedUnit, precipitationUnit } = (await hydrated('US')).getState();
    expect([temperatureUnit, windSpeedUnit, precipitationUnit]).toEqual(['f', 'mph', 'in']);
  });

  it('derives metric units for every other region', async () => {
    const { temperatureUnit, windSpeedUnit, precipitationUnit } = (await hydrated('FR')).getState();
    expect([temperatureUnit, windSpeedUnit, precipitationUnit]).toEqual(['c', 'kmh', 'mm']);
  });

  it('defaults appearance, last viewed place and the location prompt flag', async () => {
    const state = (await hydrated('FR')).getState();
    expect(state.appearance).toBe('system');
    expect(state.lastViewedPlaceId).toBe('current');
    expect(state.hasSeenLocationPrompt).toBe(false);
  });

  it('reports ready only after hydration', async () => {
    const store = createPreferencesStore({ regionCode: 'FR' });
    expect(store.isReady()).toBe(false);
    await store.hydrate();
    expect(store.isReady()).toBe(true);
  });

  it('exposes usable defaults before hydration', () => {
    const store = createPreferencesStore({ regionCode: 'US' });
    expect(store.getState().temperatureUnit).toBe('f');
  });
});

describe('persistence', () => {
  it('writes updates to w34th3r:prefs as a version 1 document', async () => {
    const store = await hydrated('FR');
    await store.update({ temperatureUnit: 'f', appearance: 'dark' });
    const raw = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.prefs))!);
    expect(raw.version).toBe(1);
    expect(raw.temperatureUnit).toBe('f');
    expect(raw.appearance).toBe('dark');
  });

  it('restores stored preferences in a new store, ahead of region defaults', async () => {
    const first = await hydrated('FR');
    await first.update({ temperatureUnit: 'f', lastViewedPlaceId: '48.86,2.35' });
    const second = await hydrated('FR');
    expect(second.getState().temperatureUnit).toBe('f');
    expect(second.getState().lastViewedPlaceId).toBe('48.86,2.35');
    expect(second.getState().windSpeedUnit).toBe('kmh');
  });

  it('ignores invalid stored fields individually and keeps the valid ones', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.prefs,
      JSON.stringify({
        version: 1,
        temperatureUnit: 'kelvin',
        windSpeedUnit: 'kn',
        appearance: 42,
        hasSeenLocationPrompt: 'yes',
      }),
    );
    const state = (await hydrated('US')).getState();
    expect(state.temperatureUnit).toBe('f'); // invalid, region default
    expect(state.windSpeedUnit).toBe('kn'); // valid, kept
    expect(state.appearance).toBe('system');
    expect(state.hasSeenLocationPrompt).toBe(false);
  });

  it('falls back to defaults when storage is corrupt', async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.prefs, '%%%');
    const state = (await hydrated('FR')).getState();
    expect(state.temperatureUnit).toBe('c');
  });

  it('keeps in-memory state when persisting fails', async () => {
    const store = await hydrated('FR');
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    await store.update({ appearance: 'light' });
    expect(store.getState().appearance).toBe('light');
  });
});

describe('subscriptions', () => {
  it('notifies subscribers on update and stops after unsubscribe', async () => {
    const store = await hydrated('FR');
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    await store.update({ windSpeedUnit: 'mph' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await store.update({ windSpeedUnit: 'kn' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('returns a new state object after each update (stable between updates)', async () => {
    const store = await hydrated('FR');
    const before = store.getState();
    expect(store.getState()).toBe(before);
    await store.update({ appearance: 'dark' });
    expect(store.getState()).not.toBe(before);
    expect(before.appearance).toBe('system');
  });

  it('notifies once hydration completes', async () => {
    const store = createPreferencesStore({ regionCode: 'FR' });
    const listener = jest.fn();
    store.subscribe(listener);
    await store.hydrate();
    expect(listener).toHaveBeenCalled();
  });
});
