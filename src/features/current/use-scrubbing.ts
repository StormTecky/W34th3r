import { useCallback, useMemo, useState } from 'react';

import type { WeatherSnapshot } from '@/domain/types';
import { buildHourlyRows, type HourlyRow } from '@/features/forecast/forecast-view-model';
import { buildMoment, clampIndex, type Moment } from '@/features/forecast/scrub';
import { usePreferences } from '@/features/settings/use-preferences';
import { useNowSeconds } from '@/lib/use-now';

export interface Scrubbing {
  rows: HourlyRow[];
  /** 0 is now. */
  index: number;
  isScrubbing: boolean;
  /** The chosen hour, or null while showing the live conditions. */
  moment: Moment | null;
  setIndex: (index: number) => void;
  step: (delta: number) => void;
  /** Back to the live conditions. */
  reset: () => void;
}

/**
 * State for the time-travel bar: which forecast hour is shown. It starts at now each time the
 * screen appears, survives a data refresh, and stays inside the hours that exist.
 */
export function useScrubbing(snapshot: WeatherSnapshot | undefined): Scrubbing {
  const { preferences } = usePreferences();
  const now = useNowSeconds();
  const units = preferences.temperatureUnit;
  const rows = useMemo(
    () => (snapshot ? buildHourlyRows(snapshot, { units, now }) : []),
    [snapshot, units, now],
  );

  const [requested, setRequested] = useState(0);
  const index = clampIndex(requested, rows.length);
  const count = rows.length;

  const setIndex = useCallback((next: number) => setRequested(clampIndex(next, count)), [count]);
  const step = useCallback(
    (delta: number) => setRequested(clampIndex(index + delta, count)),
    [index, count],
  );
  const reset = useCallback(() => setRequested(0), []);
  const moment = useMemo(() => buildMoment(rows, index), [rows, index]);

  return { rows, index, isScrubbing: index > 0, moment, setIndex, step, reset };
}
