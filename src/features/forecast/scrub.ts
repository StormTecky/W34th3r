import type { ConditionCategory } from '@/domain/types';

import type { HourlyRow } from './forecast-view-model';

/** Hours on the time-travel bar: index 0 is "now", then one step per forecast hour. */

/** Keeps an index inside the available hours, rounding to the nearest whole hour. */
export function clampIndex(index: number, count: number): number {
  if (count <= 0 || Number.isNaN(index)) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(index)));
}

/** Length of the part of the bar the ticks occupy: its width minus the inset on each side. */
function trackLength(width: number, inset: number): number {
  return Math.max(0, width - 2 * inset);
}

/**
 * The hour whose tick is nearest to a touch at `x` along a bar `width` points wide. The first and
 * last ticks sit `inset` points from the edges, so touches in the margins pick them.
 */
export function indexFromPosition(x: number, width: number, count: number, inset = 0): number {
  const track = trackLength(width, inset);
  if (count <= 1 || track <= 0 || Number.isNaN(x)) return 0;
  return clampIndex(((x - inset) / track) * (count - 1), count);
}

/** The x position of an hour's tick, from the bar's left edge. The handle is centred on it. */
export function centerFromIndex(index: number, count: number, width: number, inset = 0): number {
  return inset + positionFromIndex(index, count) * trackLength(width, inset);
}

/** Where an hour sits along the bar, from 0 (left edge) to 1 (right edge). */
export function positionFromIndex(index: number, count: number): number {
  if (count <= 1) return 0;
  return clampIndex(index, count) / (count - 1);
}

/** A moment other than now, as shown on the weather screen while travelling in time. */
export interface Moment {
  dayTimeLabel: string;
  /** Degrees C. */
  temperature: number;
  condition: ConditionCategory;
  isDay: boolean;
  summary: string;
  /** Percent, 0-100. */
  precipChance: number;
}

/** The chosen hour as a moment, or null for "now" (already shown live) or an unknown hour. */
export function buildMoment(rows: readonly HourlyRow[], index: number): Moment | null {
  const row = index > 0 ? rows[index] : undefined;
  if (!row) return null;
  return {
    dayTimeLabel: row.dayTimeLabel,
    temperature: row.temperature,
    condition: row.condition,
    isDay: row.isDay,
    summary: row.summary,
    precipChance: row.precipChance,
  };
}
