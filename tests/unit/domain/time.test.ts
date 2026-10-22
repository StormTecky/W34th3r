import {
  dayKey,
  localNoon,
  utcOffsetSeconds,
  formatClockTime,
  formatHourLabel,
  formatWeekday,
  relativeDayLabel,
} from '@/domain/time';

// All instants below are fixed UTC epochs; the clock is always injected, never read.
const utc = (iso: string) => Math.floor(Date.parse(iso) / 1000);

describe('formatHourLabel', () => {
  it('formats the hour in the place zone, not the device zone', () => {
    const t = utc('2026-10-20T12:00:00Z');
    expect(formatHourLabel(t, 'America/New_York')).toBe('8 AM');
    expect(formatHourLabel(t, 'Asia/Tokyo')).toBe('9 PM');
    expect(formatHourLabel(t, 'Europe/London')).toBe('1 PM');
  });

  it('supports other locales with 24-hour clocks', () => {
    expect(formatHourLabel(utc('2026-10-20T12:00:00Z'), 'Europe/Paris', 'fr-FR')).toMatch(/14/);
  });

  it('uses a plain space, never a narrow no-break space', () => {
    expect(formatHourLabel(utc('2026-10-20T12:00:00Z'), 'UTC')).not.toMatch(/[  ]/);
  });
});

describe('formatClockTime', () => {
  it('formats minutes in the place zone', () => {
    expect(formatClockTime(utc('2026-10-20T10:42:00Z'), 'America/Los_Angeles')).toBe('3:42 AM');
  });

  it('handles half-hour offsets (Asia/Kolkata, UTC+5:30)', () => {
    expect(formatClockTime(utc('2026-10-20T00:00:00Z'), 'Asia/Kolkata')).toBe('5:30 AM');
  });

  it('handles quarter-hour offsets (Asia/Kathmandu, UTC+5:45)', () => {
    expect(formatClockTime(utc('2026-10-20T00:00:00Z'), 'Asia/Kathmandu')).toBe('5:45 AM');
  });
});

describe('dayKey and date-line zones', () => {
  it('returns the local calendar date in the place zone', () => {
    const t = utc('2026-10-20T23:30:00Z');
    expect(dayKey(t, 'UTC')).toBe('2026-10-20');
    expect(dayKey(t, 'Asia/Tokyo')).toBe('2026-10-21');
    expect(dayKey(t, 'America/Los_Angeles')).toBe('2026-10-20');
  });

  it('puts the same instant on different dates either side of the date line', () => {
    const t = utc('2026-10-20T12:00:00Z');
    expect(dayKey(t, 'Pacific/Kiritimati')).toBe('2026-10-21'); // UTC+14
    expect(dayKey(t, 'Pacific/Pago_Pago')).toBe('2026-10-20'); // UTC-11
    expect(formatWeekday(t, 'Pacific/Kiritimati')).toBe('Wednesday');
    expect(formatWeekday(t, 'Pacific/Pago_Pago')).toBe('Tuesday');
  });
});

describe('relativeDayLabel', () => {
  const tz = 'America/New_York';

  it('labels Today and Tomorrow using the place calendar, across midnight', () => {
    // 2026-10-20 23:30 in New York (03:30Z on the 21st).
    const now = utc('2026-10-21T03:30:00Z');
    expect(relativeDayLabel(utc('2026-10-21T03:45:00Z'), now, tz)).toBe('Today');
    // 00:15 local on the 21st is already Tomorrow even though it is 45 minutes away.
    expect(relativeDayLabel(utc('2026-10-21T04:15:00Z'), now, tz)).toBe('Tomorrow');
  });

  it('falls back to the weekday name beyond tomorrow', () => {
    const now = utc('2026-10-20T15:00:00Z');
    expect(relativeDayLabel(utc('2026-10-23T15:00:00Z'), now, tz)).toBe('Friday');
  });

  it('uses the place zone, not the device zone, for "today"', () => {
    const now = utc('2026-10-20T20:00:00Z'); // 05:00 on the 21st in Tokyo
    expect(relativeDayLabel(utc('2026-10-20T20:00:00Z'), now, 'Asia/Tokyo')).toBe('Today');
    expect(relativeDayLabel(utc('2026-10-20T20:00:00Z'), now, 'America/New_York')).toBe('Today');
    expect(relativeDayLabel(utc('2026-10-21T20:00:00Z'), now, 'Asia/Tokyo')).toBe('Tomorrow');
  });
});

describe('daylight-saving transitions', () => {
  it('shows the repeated 1 AM hour twice when US clocks fall back (2026-11-01)', () => {
    const tz = 'America/New_York';
    const firstOneAm = utc('2026-11-01T05:00:00Z'); // 1:00 EDT
    const secondOneAm = utc('2026-11-01T06:00:00Z'); // 1:00 EST
    expect(formatHourLabel(firstOneAm, tz)).toBe('1 AM');
    expect(formatHourLabel(secondOneAm, tz)).toBe('1 AM');
    expect(formatHourLabel(utc('2026-11-01T07:00:00Z'), tz)).toBe('2 AM');
  });

  it('keeps the calendar day correct across the transition', () => {
    const tz = 'America/New_York';
    expect(dayKey(utc('2026-11-01T03:59:00Z'), tz)).toBe('2026-10-31');
    expect(dayKey(utc('2026-11-01T04:00:00Z'), tz)).toBe('2026-11-01');
    expect(dayKey(utc('2026-11-02T04:59:00Z'), tz)).toBe('2026-11-01'); // still Nov 1 in EST
    expect(dayKey(utc('2026-11-02T05:00:00Z'), tz)).toBe('2026-11-02');
  });

  it('skips the missing hour when UK clocks spring forward (2026-03-29)', () => {
    const tz = 'Europe/London';
    expect(formatHourLabel(utc('2026-03-29T00:30:00Z'), tz)).toBe('12 AM');
    expect(formatHourLabel(utc('2026-03-29T01:00:00Z'), tz)).toBe('2 AM');
  });
});

describe('fallback to the provider UTC offset', () => {
  it('uses the offset when the runtime rejects the IANA zone', () => {
    const t = utc('2026-10-20T12:00:00Z');
    expect(formatHourLabel(t, 'Not/AZone', 'en-US', 3600 * 2)).toBe('2 PM');
    expect(formatClockTime(t, 'Not/AZone', 'en-US', -(3600 * 5 + 1800))).toBe('6:30 AM');
    expect(dayKey(utc('2026-10-20T23:00:00Z'), 'Not/AZone', 3600 * 2)).toBe('2026-10-21');
  });

  it('falls back to UTC when the zone is rejected and no offset is given', () => {
    expect(formatHourLabel(utc('2026-10-20T12:00:00Z'), 'Not/AZone')).toBe('12 PM');
  });
});

describe('utcOffsetSeconds', () => {
  it('returns the offset in effect at that instant, including DST', () => {
    expect(utcOffsetSeconds(utc('2026-10-20T12:00:00Z'), 'America/New_York')).toBe(-4 * 3600);
    expect(utcOffsetSeconds(utc('2026-12-20T12:00:00Z'), 'America/New_York')).toBe(-5 * 3600);
    expect(utcOffsetSeconds(utc('2026-10-20T12:00:00Z'), 'Europe/Paris')).toBe(2 * 3600);
  });

  it('handles half-hour, quarter-hour and extreme offsets', () => {
    const t = utc('2026-10-20T12:00:00Z');
    expect(utcOffsetSeconds(t, 'Asia/Kolkata')).toBe(5.5 * 3600);
    expect(utcOffsetSeconds(t, 'Asia/Kathmandu')).toBe(5.75 * 3600);
    expect(utcOffsetSeconds(t, 'Pacific/Kiritimati')).toBe(14 * 3600);
    expect(utcOffsetSeconds(t, 'Pacific/Pago_Pago')).toBe(-11 * 3600);
  });

  it('uses the fallback offset for a rejected zone, or 0 without one', () => {
    const t = utc('2026-10-20T12:00:00Z');
    expect(utcOffsetSeconds(t, 'Not/AZone', 3600)).toBe(3600);
    expect(utcOffsetSeconds(t, 'Not/AZone')).toBe(0);
  });
});

describe('localNoon', () => {
  it('returns 12:00 on the local calendar day of the instant', () => {
    expect(localNoon(utc('2026-10-20T03:30:00Z'), 'America/New_York')).toBe(
      utc('2026-10-19T16:00:00Z'),
    );
    expect(localNoon(utc('2026-10-20T03:30:00Z'), 'Asia/Tokyo')).toBe(utc('2026-10-20T03:00:00Z'));
  });

  it('uses the offset in effect at noon when clocks change that day', () => {
    // US clocks fall back on 2026-11-01 at 2 AM: noon that day is EST (UTC-5).
    expect(localNoon(utc('2026-11-01T10:00:00Z'), 'America/New_York')).toBe(
      utc('2026-11-01T17:00:00Z'),
    );
    expect(localNoon(utc('2026-10-31T20:00:00Z'), 'America/New_York')).toBe(
      utc('2026-10-31T16:00:00Z'),
    );
  });

  it('falls back to the provider offset for a rejected zone', () => {
    expect(localNoon(utc('2026-10-20T08:00:00Z'), 'Not/AZone', 7200)).toBe(
      utc('2026-10-20T10:00:00Z'),
    );
  });
});

describe('unexpected formatter failures', () => {
  afterEach(() => jest.restoreAllMocks());

  it('rethrows errors that are not an unsupported time zone', () => {
    // A locale and zone not used elsewhere, so no cached formatter is reused.
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementationOnce(() => {
      throw new TypeError('boom');
    });
    expect(() => formatHourLabel(0, 'Africa/Nairobi', 'sv-SE')).toThrow(TypeError);
  });
});

describe('French dates and times', () => {
  const noon = utc('2026-10-22T12:42:00Z');

  it('writes hours the French way', () => {
    expect(formatHourLabel(noon, 'Europe/Paris', 'fr-FR')).toBe('14 h');
    expect(formatHourLabel(noon, 'Europe/Paris', 'en-GB')).toBe('14');
  });

  it('writes clock times with the region conventions', () => {
    expect(formatClockTime(noon, 'Europe/Paris', 'fr-FR')).toBe('14:42');
    expect(formatClockTime(noon, 'America/Montreal', 'fr-CA')).toBe('8 h 42');
    expect(formatClockTime(noon, 'Europe/London', 'en-GB')).toBe('13:42');
  });

  it('capitalises weekday names, which French writes in lower case', () => {
    expect(formatWeekday(noon, 'Europe/Paris', 'fr-FR')).toBe('Jeudi');
    expect(formatWeekday(noon, 'Europe/Paris')).toBe('Thursday');
  });

  it('says Aujourd’hui, Demain, then the weekday', () => {
    const now = utc('2026-10-20T15:00:00Z');
    const tz = 'Europe/Paris';
    expect(relativeDayLabel(utc('2026-10-20T16:00:00Z'), now, tz, 'fr-FR')).toBe("Aujourd'hui");
    expect(relativeDayLabel(utc('2026-10-21T16:00:00Z'), now, tz, 'fr-FR')).toBe('Demain');
    expect(relativeDayLabel(utc('2026-10-23T16:00:00Z'), now, tz, 'fr-FR')).toBe('Vendredi');
  });

  it('formats through the provider offset when the zone is rejected', () => {
    expect(formatClockTime(noon, 'Not/AZone', 'fr-FR', 7200)).toBe('14:42');
  });

  it('keeps the calendar day key independent of the locale', () => {
    expect(dayKey(noon, 'Europe/Paris')).toBe('2026-10-22');
  });
});
