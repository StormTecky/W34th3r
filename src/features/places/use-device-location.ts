import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { roundCoordinate } from '@/domain/place';
import { usePreferences } from '@/features/settings/use-preferences';
import { log } from '@/lib/logger';

export type LocationStatus = 'checking' | 'undetermined' | 'granted' | 'denied' | 'unavailable';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface DeviceLocation {
  status: LocationStatus;
  /** Rounded to 2 decimals; null until a position is known. */
  coords: Coordinates | null;
  /** False once the OS will no longer show the permission prompt. */
  canAskAgain: boolean;
  /** Shows the OS permission prompt. */
  requestPermission: () => Promise<void>;
  /** Reads the position again (or re-checks permission if it is not granted). */
  refresh: () => Promise<void>;
}

interface State {
  status: LocationStatus;
  coords: Coordinates | null;
  canAskAgain: boolean;
}

const LAST_KNOWN_MAX_AGE_MS = 10 * 60 * 1000;

async function readPosition(): Promise<Coordinates> {
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
  return {
    lat: roundCoordinate(position.coords.latitude),
    lon: roundCoordinate(position.coords.longitude),
  };
}

const UNAVAILABLE: State = { status: 'unavailable', coords: null, canAskAgain: true };

async function stateFromPermission(
  permission: Location.LocationPermissionResponse,
): Promise<State> {
  const { canAskAgain } = permission;
  if (!permission.granted) {
    const denied = permission.status === Location.PermissionStatus.DENIED;
    return { status: denied ? 'denied' : 'undetermined', coords: null, canAskAgain };
  }
  try {
    return { status: 'granted', coords: await readPosition(), canAskAgain };
  } catch {
    return { status: 'unavailable', coords: null, canAskAgain };
  }
}

async function checkPermission(): Promise<State> {
  try {
    return await stateFromPermission(await Location.getForegroundPermissionsAsync());
  } catch {
    return UNAVAILABLE;
  }
}

async function askPermission(): Promise<State> {
  try {
    return await stateFromPermission(await Location.requestForegroundPermissionsAsync());
  } catch {
    return UNAVAILABLE;
  }
}

/**
 * Foreground device location. Only coarse, rounded coordinates leave this hook, and they are never
 * logged. The OS prompt is shown only when `requestPermission` is called, so the UI can explain
 * first.
 */
export function useDeviceLocation(): DeviceLocation {
  const { update } = usePreferences();
  const [state, setState] = useState<State>({
    status: 'checking',
    coords: null,
    canAskAgain: true,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (operation: () => Promise<State>) => {
    const next = await operation();
    if (mounted.current) setState(next);
  }, []);

  const check = useCallback(() => run(checkPermission), [run]);
  const requestPermission = useCallback(async () => {
    await run(askPermission);
    await update({ hasSeenLocationPrompt: true });
  }, [run, update]);

  useEffect(() => {
    void check();
  }, [check]);

  // Returning from the OS settings screen may have changed the permission.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void check();
    });
    return () => subscription.remove();
  }, [check]);

  useEffect(() => {
    log.info('Location status', { status: state.status });
  }, [state.status]);

  return { ...state, requestPermission, refresh: check };
}
