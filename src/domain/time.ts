/**
 * Place-local time formatting. Everything is expressed in the viewed place's IANA time zone, never
 * the device's. If the runtime rejects the zone we fall back to the provider's UTC offset.
 */

const DEFAULT_LOCALE = 'en-US';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${timeZone}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/** Newer ICU versions put a narrow no-break space before AM/PM; normalise it for stable output. */
function normaliseSpaces(text: string): string {
  return text.replace(/[  ]/g, ' ');
}

function formatParts(
  epochSeconds: number,
  timeZone: string,
  offsetSeconds: number | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatPart[] {
  try {
    return getFormatter(locale, timeZone, options).formatToParts(new Date(epochSeconds * 1000));
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    const shifted = new Date((epochSeconds + (offsetSeconds ?? 0)) * 1000);
    return getFormatter(locale, 'UTC', options).formatToParts(shifted);
  }
}

/** Value of a part that the requested options guarantee to be present. */
function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)!.value;
}

function format(
  epochSeconds: number,
  timeZone: string,
  offsetSeconds: number | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const parts = formatParts(epochSeconds, timeZone, offsetSeconds, locale, options);
  return normaliseSpaces(parts.map((part) => part.value).join(''));
}

/** e.g. "3 PM" */
export function formatHourLabel(
  epochSeconds: number,
  timeZone: string,
  locale: string = DEFAULT_LOCALE,
  offsetSeconds?: number,
): string {
  return format(epochSeconds, timeZone, offsetSeconds, locale, { hour: 'numeric' });
}

/** e.g. "3:42 AM" (used for sunrise and sunset) */
export function formatClockTime(
  epochSeconds: number,
  timeZone: string,
  locale: string = DEFAULT_LOCALE,
  offsetSeconds?: number,
): string {
  return format(epochSeconds, timeZone, offsetSeconds, locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** e.g. "Tuesday" */
export function formatWeekday(
  epochSeconds: number,
  timeZone: string,
  locale: string = DEFAULT_LOCALE,
  offsetSeconds?: number,
): string {
  return format(epochSeconds, timeZone, offsetSeconds, locale, { weekday: 'long' });
}

/** Local calendar date in the place's zone as "YYYY-MM-DD". */
export function dayKey(epochSeconds: number, timeZone: string, offsetSeconds?: number): string {
  const parts = formatParts(epochSeconds, timeZone, offsetSeconds, 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return `${partValue(parts, 'year')}-${partValue(parts, 'month')}-${partValue(parts, 'day')}`;
}

function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000);
}

/** "Today", "Tomorrow", or the weekday name, judged on the place's calendar (DST-safe). */
export function relativeDayLabel(
  epochSeconds: number,
  nowSeconds: number,
  timeZone: string,
  locale: string = DEFAULT_LOCALE,
  offsetSeconds?: number,
): string {
  const diff =
    dayNumber(dayKey(epochSeconds, timeZone, offsetSeconds)) -
    dayNumber(dayKey(nowSeconds, timeZone, offsetSeconds));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return formatWeekday(epochSeconds, timeZone, locale, offsetSeconds);
}

/** Offset of the place's local time from UTC at that instant, in seconds (DST-aware). */
export function utcOffsetSeconds(
  epochSeconds: number,
  timeZone: string,
  fallbackOffsetSeconds?: number,
): number {
  const parts = formatParts(epochSeconds, timeZone, fallbackOffsetSeconds, 'en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(partValue(parts, type));
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round(asUtc / 1000 - Math.floor(epochSeconds));
}

/** The instant of 12:00 local time on the place's calendar day containing `epochSeconds`. */
export function localNoon(epochSeconds: number, timeZone: string, offsetSeconds?: number): number {
  const [year, month, day] = dayKey(epochSeconds, timeZone, offsetSeconds)
    .split('-')
    .map(Number) as [number, number, number];
  const noonAsUtc = Date.UTC(year, month - 1, day, 12) / 1000;
  // The offset can differ at noon from the offset at `epochSeconds` when clocks change that day.
  const guess = noonAsUtc - utcOffsetSeconds(epochSeconds, timeZone, offsetSeconds);
  return noonAsUtc - utcOffsetSeconds(guess, timeZone, offsetSeconds);
}
