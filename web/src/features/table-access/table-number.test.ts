import { describe, expect, it } from "vitest";
import { formatTableNumber } from "./table-number";

describe("formatTableNumber", () => {
  it("pads single-digit table numbers to two digits", () => {
    expect(formatTableNumber(7)).toBe("07");
    expect(formatTableNumber(0)).toBe("00");
  });

  it("keeps numbers with two or more digits as they are", () => {
    expect(formatTableNumber(12)).toBe("12");
    expect(formatTableNumber(123)).toBe("123");
  });
});
