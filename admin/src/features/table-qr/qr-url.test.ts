import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CUSTOMER_APP_URL, buildTableQrUrl, formatDisplayUrl, getCustomerAppUrl } from "./qr-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getCustomerAppUrl", () => {
  it("defaults to the local customer app", () => {
    vi.stubEnv("NEXT_PUBLIC_CUSTOMER_APP_URL", "");
    expect(getCustomerAppUrl()).toBe(DEFAULT_CUSTOMER_APP_URL);
    expect(DEFAULT_CUSTOMER_APP_URL).toBe("http://localhost:3000");
  });

  it("reads NEXT_PUBLIC_CUSTOMER_APP_URL without trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_CUSTOMER_APP_URL", " https://cafe.central/ ");
    expect(getCustomerAppUrl()).toBe("https://cafe.central");
  });
});

describe("buildTableQrUrl", () => {
  it("points the customer app at the table number and its public token", () => {
    expect(buildTableQrUrl({ number: 7, token: "4pX9kR2mL7" }, "https://cafe.central")).toBe(
      "https://cafe.central/?mesa=07&qr=4pX9kR2mL7",
    );
  });

  it("uses the configured customer app by default", () => {
    vi.stubEnv("NEXT_PUBLIC_CUSTOMER_APP_URL", "");
    expect(buildTableQrUrl({ number: 12, token: "Zz9Yy8Xx7W" })).toBe("http://localhost:3000/?mesa=12&qr=Zz9Yy8Xx7W");
  });

  it("encodes the token", () => {
    expect(buildTableQrUrl({ number: 1, token: "a b" }, "http://x")).toBe("http://x/?mesa=01&qr=a%20b");
  });
});

describe("formatDisplayUrl", () => {
  it("drops the protocol, as the 09C access field shows it", () => {
    expect(formatDisplayUrl("http://localhost:3000/?mesa=07&qr=4pX9kR2mL7")).toBe("localhost:3000/?mesa=07&qr=4pX9kR2mL7");
  });
});
