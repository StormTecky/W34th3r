import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';

import { createPreferencesStore } from '@/features/settings/preferences-store';
import { PreferencesProvider } from '@/features/settings/use-preferences';
import { useDeviceLocation } from '@/features/places/use-device-location';

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;

const permission = (status: 'granted' | 'denied' | 'undetermined', canAskAgain = true) =>
  ({ status, granted: status === 'granted', canAskAgain, expires: 'never' }) as never;

const position = (latitude: number, longitude: number) =>
  ({ coords: { latitude, longitude }, timestamp: 0 }) as never;

async function setup() {
  const store = createPreferencesStore({ regionCode: 'FR' });
  await store.hydrate();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PreferencesProvider store={store}>{children}</PreferencesProvider>
  );
  const view = await renderHook(() => useDeviceLocation(), { wrapper });
  return { ...view, store };
}

beforeEach(() => {
  for (const fn of [
    mocked.getForegroundPermissionsAsync,
    mocked.requestForegroundPermissionsAsync,
    mocked.getLastKnownPositionAsync,
    mocked.getCurrentPositionAsync,
  ]) {
    fn.mockReset();
  }
  mocked.getLastKnownPositionAsync.mockResolvedValue(null);
  jest.spyOn(console, 'debug').mockImplementation(() => undefined);
  jest.spyOn(console, 'info').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('permission already granted', () => {
  it('returns coordinates rounded to 2 decimals', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    mocked.getCurrentPositionAsync.mockResolvedValue(position(48.85661, 2.35222));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(result.current.coords).toEqual({ lat: 48.86, lon: 2.35 });
  });

  it('uses a recent last-known position without waiting for a fresh fix', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    mocked.getLastKnownPositionAsync.mockResolvedValue(position(40.7128, -74.006));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(result.current.coords).toEqual({ lat: 40.71, lon: -74.01 });
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('asks for coarse accuracy only', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    mocked.getCurrentPositionAsync.mockResolvedValue(position(1, 2));
    await setup();
    await waitFor(() => expect(mocked.getCurrentPositionAsync).toHaveBeenCalled());
    expect(mocked.getCurrentPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: Location.Accuracy.Low }),
    );
  });
});

describe('permission undetermined', () => {
  it('waits for the user, then requests, resolves coordinates, and remembers the prompt was shown', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    mocked.getCurrentPositionAsync.mockResolvedValue(position(35.6812, 139.7671));
    const { result, store } = await setup();
    await waitFor(() => expect(result.current.status).toBe('undetermined'));
    expect(result.current.coords).toBeNull();
    expect(mocked.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

    await act(async () => result.current.requestPermission());
    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(result.current.coords).toEqual({ lat: 35.68, lon: 139.77 });
    expect(mocked.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(store.getState().hasSeenLocationPrompt).toBe(true);
  });

  it('moves to denied when the user refuses', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permission('denied', false));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('undetermined'));
    await act(async () => result.current.requestPermission());
    expect(result.current.status).toBe('denied');
    expect(result.current.canAskAgain).toBe(false);
  });
});

describe('a browser that cannot find the position', () => {
  // expo-location on the web answers "granted: false" with the GRANTED status when the permission
  // request fails for a reason other than a refusal (no fix, timeout).
  it('is unavailable, not undetermined, so the user is not asked the same question again', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    mocked.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: false,
      canAskAgain: true,
      expires: 0,
    } as never);
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('undetermined'));
    await act(async () => result.current.requestPermission());
    expect(result.current.status).toBe('unavailable');
    expect(result.current.coords).toBeNull();
  });
});

describe('permission denied', () => {
  it('reports denied without throwing or fetching a position', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('denied', false));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('denied'));
    expect(result.current.coords).toBeNull();
    expect(result.current.canAskAgain).toBe(false);
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });
});

describe('failures', () => {
  it('reports unavailable when the position cannot be read', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error('Location services are disabled'));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
    expect(result.current.coords).toBeNull();
  });

  it('reports unavailable when the permission check itself throws', async () => {
    mocked.getForegroundPermissionsAsync.mockRejectedValue(new Error('boom'));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });
});

describe('returning to the app', () => {
  it('re-checks permission on foreground, picking up a grant made in OS settings', async () => {
    let onChange: (state: string) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      onChange = handler as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
    mocked.getForegroundPermissionsAsync.mockResolvedValueOnce(permission('denied', false));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('denied'));

    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    mocked.getCurrentPositionAsync.mockResolvedValue(position(51.5074, -0.1278));
    await act(async () => onChange('active'));
    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(result.current.coords).toEqual({ lat: 51.51, lon: -0.13 });
  });

  it('ignores non-active app states', async () => {
    let onChange: (state: string) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      onChange = handler as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('denied', false));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('denied'));
    const calls = mocked.getForegroundPermissionsAsync.mock.calls.length;
    await act(async () => onChange('background'));
    expect(mocked.getForegroundPermissionsAsync.mock.calls.length).toBe(calls);
  });
});

describe('refresh', () => {
  it('reads the position again on demand', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    mocked.getCurrentPositionAsync.mockResolvedValueOnce(position(10.1, 20.2));
    const { result } = await setup();
    await waitFor(() => expect(result.current.coords).toEqual({ lat: 10.1, lon: 20.2 }));
    mocked.getCurrentPositionAsync.mockResolvedValueOnce(position(11.1, 21.2));
    await act(async () => result.current.refresh());
    expect(result.current.coords).toEqual({ lat: 11.1, lon: 21.2 });
  });
});

describe('privacy', () => {
  it('never writes coordinates to the logs', async () => {
    const spies = (['debug', 'info', 'warn', 'error'] as const).map((level) =>
      jest.spyOn(console, level).mockImplementation(() => undefined),
    );
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
    mocked.getCurrentPositionAsync.mockResolvedValue(position(48.85661, 2.35222));
    const { result } = await setup();
    await waitFor(() => expect(result.current.status).toBe('granted'));
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(logged).not.toContain('48.85');
    expect(logged).not.toContain('2.35');
  });
});
