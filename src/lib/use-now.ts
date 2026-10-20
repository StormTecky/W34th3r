import { useEffect, useState } from 'react';

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Current time in epoch seconds, refreshed on an interval so "updated N min ago" stays current. */
export function useNowSeconds(intervalMs = 30_000): number {
  const [now, setNow] = useState(nowSeconds);
  useEffect(() => {
    const timer = setInterval(() => setNow(nowSeconds()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
