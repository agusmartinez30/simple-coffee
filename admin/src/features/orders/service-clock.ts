/**
 * Wall clock of the orders board. Times are local "HH:MM" in the venue time zone, the same one
 * the API uses for its service day (`api/src/modules/orders/domain/service-day.ts`).
 */

export const SERVICE_TIME_ZONE = "America/Argentina/Buenos_Aires";

const TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: SERVICE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "14:36" for `at` in the service time zone. */
export function formatServiceTime(at: Date): string {
  const parts = TIME_FORMAT.formatToParts(at);
  const part = (type: "hour" | "minute") => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("hour")}:${part("minute")}`;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Whole minutes from `from` to `to` on the same day, e.g. "12:42" → "13:00" is 18. */
export function minutesBetween(from: string, to: string): number {
  return toMinutes(to) - toMinutes(from);
}
