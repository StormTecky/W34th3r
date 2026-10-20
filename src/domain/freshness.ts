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
export function formatAge(fetchedAt: number, nowSeconds: number): string {
  const age = ageSeconds(fetchedAt, nowSeconds);
  if (age < 60) return 'Updated just now';
  if (age < 3600) return `Updated ${Math.floor(age / 60)} min ago`;
  if (age < 86_400) return `Updated ${Math.floor(age / 3600)} h ago`;
  return `Updated ${Math.floor(age / 86_400)} d ago`;
}
