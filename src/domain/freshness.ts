import { DEFAULT_LOCALE } from './locale';
import { messagesFor } from './messages';

/** Weather data older than this is stale and should be refetched. */
export const STALE_AFTER_SECONDS = 15 * 60;

export type Freshness = 'fresh' | 'stale';

/** Age in whole seconds; a fetch time in the future (clock skew) counts as zero. */
export function ageSeconds(fetchedAt: number, nowSeconds: number): number {
  return Math.max(0, Math.floor(nowSeconds - fetchedAt));
}

export function freshnessOf(fetchedAt: number, nowSeconds: number): Freshness {
  return ageSeconds(fetchedAt, nowSeconds) > STALE_AFTER_SECONDS ? 'stale' : 'fresh';
}

/** "Updated just now", "Updated 5 min ago", "Updated 3 h ago", "Updated 2 d ago". */
export function formatAge(
  fetchedAt: number,
  nowSeconds: number,
  locale: string = DEFAULT_LOCALE,
): string {
  const age = ageSeconds(fetchedAt, nowSeconds);
  const text = messagesFor(locale).freshness;
  if (age < 60) return text.justNow;
  if (age < 3600) return text.minutesAgo(Math.floor(age / 60));
  if (age < 86_400) return text.hoursAgo(Math.floor(age / 3600));
  return text.daysAgo(Math.floor(age / 86_400));
}
