import { describe, expect, it } from "vitest";
import { parseTableQrParams, sameTableCredentials, stripTableQrParams } from "./table-qr-params";

describe("parseTableQrParams", () => {
  it("reads the table number and token from the QR URL", () => {
    expect(parseTableQrParams("?mesa=07&qr=4pX9kR2mL7")).toEqual({ number: "07", token: "4pX9kR2mL7" });
  });

  it("accepts a search string without the leading question mark", () => {
    expect(parseTableQrParams("mesa=12&qr=abc")).toEqual({ number: "12", token: "abc" });
  });

  it("trims surrounding whitespace", () => {
    expect(parseTableQrParams("?mesa=%2007%20&qr=%20abc%20")).toEqual({ number: "07", token: "abc" });
  });

  it("returns null when a parameter is missing or empty", () => {
    expect(parseTableQrParams("")).toBeNull();
    expect(parseTableQrParams("?mesa=07")).toBeNull();
    expect(parseTableQrParams("?qr=abc")).toBeNull();
    expect(parseTableQrParams("?mesa=&qr=abc")).toBeNull();
    expect(parseTableQrParams("?mesa=07&qr=")).toBeNull();
  });

  it("rejects values the API schema would reject", () => {
    expect(parseTableQrParams("?mesa=7a&qr=abc")).toBeNull();
    expect(parseTableQrParams("?mesa=1234567&qr=abc")).toBeNull();
    expect(parseTableQrParams(`?mesa=07&qr=${"x".repeat(65)}`)).toBeNull();
  });

  it("accepts a token of exactly 64 characters", () => {
    const token = "x".repeat(64);
    expect(parseTableQrParams(`?mesa=07&qr=${token}`)).toEqual({ number: "07", token });
  });
});

describe("stripTableQrParams", () => {
  it("removes the QR parameters and keeps the others", () => {
    expect(stripTableQrParams("?mesa=07&qr=abc&lang=es")).toBe("?lang=es");
  });

  it("returns an empty string when only QR parameters were present", () => {
    expect(stripTableQrParams("?mesa=07&qr=abc")).toBe("");
  });

  it("leaves a search string without QR parameters untouched", () => {
    expect(stripTableQrParams("?tab=menu")).toBe("?tab=menu");
    expect(stripTableQrParams("")).toBe("");
  });
});

describe("sameTableCredentials", () => {
  it("treats equal numbers with different padding as the same table", () => {
    expect(sameTableCredentials({ number: "07", token: "a" }, { number: "7", token: "a" })).toBe(true);
  });

  it("detects a different table or token", () => {
    expect(sameTableCredentials({ number: "07", token: "a" }, { number: "08", token: "a" })).toBe(false);
    expect(sameTableCredentials({ number: "07", token: "a" }, { number: "07", token: "b" })).toBe(false);
  });
});
