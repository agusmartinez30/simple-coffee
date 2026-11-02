import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveTableQr } from "./table-access-api";

function mockFetch(impl: (input: string, init?: RequestInit) => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveTableQr", () => {
  it("calls the proxied public endpoint with the encoded number and token", async () => {
    const fetch = mockFetch(async () => json({ number: 7, label: "Mesa 07", spaceName: "Salón" }));
    await resolveTableQr("07", "a b&c");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe("/api/tables/qr?number=07&token=a+b%26c");
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });

  it("returns the table for a valid QR", async () => {
    mockFetch(async () => json({ number: 7, label: "Mesa 07", spaceName: "Salón" }));
    await expect(resolveTableQr("07", "4pX9kR2mL7")).resolves.toEqual({
      ok: true,
      table: { number: 7, label: "Mesa 07", spaceName: "Salón" },
    });
  });

  it("reports an invalid session for 404 (unknown table or inactive token)", async () => {
    mockFetch(async () => json({ error: "not_found" }, 404));
    await expect(resolveTableQr("07", "old")).resolves.toEqual({ ok: false, error: "invalid" });
  });

  it("reports an invalid session for 400 (malformed query)", async () => {
    mockFetch(async () => json({ error: "validation_error" }, 400));
    await expect(resolveTableQr("07", "x")).resolves.toEqual({ ok: false, error: "invalid" });
  });

  it("reports a network error when the request fails", async () => {
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(resolveTableQr("07", "x")).resolves.toEqual({ ok: false, error: "network" });
  });

  it("reports a network error for server errors", async () => {
    mockFetch(async () => json({ error: "internal" }, 502));
    await expect(resolveTableQr("07", "x")).resolves.toEqual({ ok: false, error: "network" });
  });

  it("reports a network error for an unexpected response body", async () => {
    mockFetch(async () => json({ number: "7" }));
    await expect(resolveTableQr("07", "x")).resolves.toEqual({ ok: false, error: "network" });
  });
});
