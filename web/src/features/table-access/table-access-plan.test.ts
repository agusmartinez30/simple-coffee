import { describe, expect, it } from "vitest";
import { parseStoredCredentials, planAccess, planOutcome, type AccessCheck } from "./table-access-plan";

const scanned = { number: "07", token: "new" };
const stored = { number: "07", token: "old" };

describe("planAccess", () => {
  it("checks the scanned QR and flags a table change against different stored credentials", () => {
    expect(planAccess(scanned, stored)).toEqual({
      kind: "check",
      credentials: scanned,
      fromUrl: true,
      tableChanged: true,
    });
  });

  it("does not flag a change when the scanned QR matches the stored one", () => {
    expect(planAccess(scanned, { number: "7", token: "new" })).toMatchObject({ tableChanged: false });
  });

  it("does not flag a change on the first scan (nothing stored)", () => {
    expect(planAccess(scanned, null)).toMatchObject({ fromUrl: true, tableChanged: false });
  });

  it("revalidates the stored credentials when the URL has no QR", () => {
    expect(planAccess(null, stored)).toEqual({
      kind: "check",
      credentials: stored,
      fromUrl: false,
      tableChanged: false,
    });
  });

  it("reports a missing QR when there is nothing to check", () => {
    expect(planAccess(null, null)).toEqual({ kind: "missing" });
  });
});

describe("planOutcome", () => {
  const fromUrl: AccessCheck = { kind: "check", credentials: scanned, fromUrl: true, tableChanged: true };
  const restored: AccessCheck = { kind: "check", credentials: stored, fromUrl: false, tableChanged: false };
  const table = { number: 7, label: "Mesa 07", spaceName: "Salón" };

  it("persists, cleans the URL and resets the session for a valid new table", () => {
    expect(planOutcome(fromUrl, { ok: true, table })).toEqual({
      storage: "save",
      stripUrl: true,
      resetSession: true,
    });
  });

  it("persists a revalidated table without touching the URL or the session", () => {
    expect(planOutcome(restored, { ok: true, table })).toEqual({
      storage: "save",
      stripUrl: false,
      resetSession: false,
    });
  });

  it("clears the storage and cleans the URL for a rejected QR, without resetting the session", () => {
    expect(planOutcome(fromUrl, { ok: false, error: "invalid" })).toEqual({
      storage: "clear",
      stripUrl: true,
      resetSession: false,
    });
  });

  it("keeps the storage and the URL on a network error so a reload retries", () => {
    expect(planOutcome(fromUrl, { ok: false, error: "network" })).toEqual({
      storage: "keep",
      stripUrl: false,
      resetSession: false,
    });
  });
});

describe("parseStoredCredentials", () => {
  it("reads credentials saved as JSON", () => {
    expect(parseStoredCredentials(JSON.stringify(stored))).toEqual(stored);
  });

  it("returns null for missing, corrupt or malformed values", () => {
    expect(parseStoredCredentials(null)).toBeNull();
    expect(parseStoredCredentials("{not json")).toBeNull();
    expect(parseStoredCredentials(JSON.stringify({ number: 7, token: "x" }))).toBeNull();
    expect(parseStoredCredentials(JSON.stringify({ number: "07", token: "" }))).toBeNull();
    expect(parseStoredCredentials(JSON.stringify(["07", "x"]))).toBeNull();
  });
});
