/**
 * The service day of the orders board: a calendar day ("YYYY-MM-DD") from local midnight to the next
 * local midnight in the venue's time zone.
 */

/**
 * Time zone of the service day. The venue profile has its own `timezone` setting, but the venue
 * module exports no service yet; replace this constant with it once it does.
 */
export const SERVICE_TIME_ZONE = 'America/Argentina/Buenos_Aires';

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether `value` is a real "YYYY-MM-DD" date. */
export function isCalendarDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Local wall-clock fields of `at` in `timeZone`. */
function localParts(at: Date, timeZone: string): Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((item) => item.type === type)?.value ?? 0);
  return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour'), minute: part('minute'), second: part('second') };
}

/** Milliseconds `timeZone` is ahead of UTC at `at` (negative west of Greenwich). */
function offsetAt(at: Date, timeZone: string): number {
  const local = localParts(at, timeZone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant of local midnight starting `year-month-day` in `timeZone`. */
function localMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const wall = Date.UTC(year, month - 1, day);
  // Two passes settle the offset when midnight falls near a daylight saving change.
  const first = wall - offsetAt(new Date(wall), timeZone);
  return new Date(wall - offsetAt(new Date(first), timeZone));
}

/** `[from, to)` instants of the service day `date` ("YYYY-MM-DD", assumed valid). */
export function serviceDayRange(date: string, timeZone: string): { from: Date; to: Date } {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return { from: localMidnight(year, month, day, timeZone), to: localMidnight(year, month, day + 1, timeZone) };
}

/** The service day ("YYYY-MM-DD") `at` falls in. */
export function serviceDateOf(at: Date, timeZone: string): string {
  const { year, month, day } = localParts(at, timeZone);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
