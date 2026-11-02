import { describe, expect, it } from 'vitest';
import { isCalendarDate, serviceDateOf, serviceDayRange } from './service-day.js';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

describe('service day', () => {
  it('spans local midnight to midnight in the venue time zone', () => {
    expect(serviceDayRange('2026-11-01', BUENOS_AIRES)).toEqual({
      from: new Date('2026-11-01T03:00:00Z'),
      to: new Date('2026-11-02T03:00:00Z'),
    });
    expect(serviceDayRange('2026-12-31', 'UTC')).toEqual({
      from: new Date('2026-12-31T00:00:00Z'),
      to: new Date('2027-01-01T00:00:00Z'),
    });
  });

  it('follows daylight saving changes', () => {
    // Madrid moves from UTC+2 to UTC+1 on 2026-10-25, so that day lasts 25 hours.
    expect(serviceDayRange('2026-10-25', 'Europe/Madrid')).toEqual({
      from: new Date('2026-10-24T22:00:00Z'),
      to: new Date('2026-10-25T23:00:00Z'),
    });
  });

  it('tells the local date of an instant', () => {
    expect(serviceDateOf(new Date('2026-11-01T02:59:59Z'), BUENOS_AIRES)).toBe('2026-10-31');
    expect(serviceDateOf(new Date('2026-11-01T03:00:00Z'), BUENOS_AIRES)).toBe('2026-11-01');
  });

  it('accepts real calendar dates only', () => {
    expect(isCalendarDate('2026-02-28')).toBe(true);
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-1-01')).toBe(false);
  });
});
