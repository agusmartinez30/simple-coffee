import { describe, expect, it } from "vitest";
import { SERVICE_TIME_ZONE, formatServiceTime, minutesBetween } from "./service-clock";

describe("service clock", () => {
  it("uses the venue time zone of the API service day", () => {
    expect(SERVICE_TIME_ZONE).toBe("America/Argentina/Buenos_Aires");
  });

  it("formats instants as local HH:MM, whatever the browser time zone", () => {
    expect(formatServiceTime(new Date("2026-11-02T17:36:59.000Z"))).toBe("14:36");
    expect(formatServiceTime(new Date("2026-11-03T02:05:00.000Z"))).toBe("23:05");
    expect(formatServiceTime(new Date("2026-11-03T03:00:00.000Z"))).toBe("00:00");
  });

  it("measures whole minutes between two HH:MM times", () => {
    expect(minutesBetween("12:42", "13:00")).toBe(18);
    expect(minutesBetween("13:00", "12:42")).toBe(-18);
  });
});
