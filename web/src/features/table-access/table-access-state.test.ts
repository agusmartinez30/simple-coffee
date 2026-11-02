import { describe, expect, it } from "vitest";
import {
  initialTableAccess,
  selectTableNumber,
  tableAccessReducer,
  type TableAccessState,
} from "./table-access-state";

const credentials = { number: "07", token: "4pX9kR2mL7" };
const table = { number: 7, label: "Mesa 07", spaceName: "Salón" };

const checking: TableAccessState = { status: "checking", credentials };

describe("tableAccessReducer", () => {
  it("starts idle", () => {
    expect(initialTableAccess).toEqual({ status: "idle" });
  });

  it("checks the given credentials", () => {
    expect(tableAccessReducer(initialTableAccess, { type: "check", credentials })).toEqual(checking);
  });

  it("is invalid with reason missing when there are no credentials", () => {
    expect(tableAccessReducer(initialTableAccess, { type: "missing" })).toEqual({
      status: "invalid",
      reason: "missing",
    });
  });

  it("becomes valid with the table when the API accepts the QR", () => {
    expect(
      tableAccessReducer(checking, { type: "resolved", credentials, result: { ok: true, table } }),
    ).toEqual({ status: "valid", table, credentials });
  });

  it("becomes invalid with reason rejected when the API rejects the QR", () => {
    expect(
      tableAccessReducer(checking, {
        type: "resolved",
        credentials,
        result: { ok: false, error: "invalid" },
      }),
    ).toEqual({ status: "invalid", reason: "rejected" });
  });

  it("goes offline and keeps the credentials for a retry on a network error", () => {
    expect(
      tableAccessReducer(checking, {
        type: "resolved",
        credentials,
        result: { ok: false, error: "network" },
      }),
    ).toEqual({ status: "offline", credentials });
  });

  it("ignores a result for credentials that are no longer being checked", () => {
    const stale = { number: "08", token: "other" };
    expect(
      tableAccessReducer(checking, {
        type: "resolved",
        credentials: stale,
        result: { ok: true, table: { ...table, number: 8 } },
      }),
    ).toBe(checking);
  });

  it("ignores a result when nothing is being checked", () => {
    const idle = initialTableAccess;
    expect(
      tableAccessReducer(idle, { type: "resolved", credentials, result: { ok: true, table } }),
    ).toBe(idle);
  });
});

describe("selectTableNumber", () => {
  it("returns the padded number only for a valid table", () => {
    expect(selectTableNumber({ status: "valid", table, credentials })).toBe("07");
    expect(selectTableNumber(checking)).toBeNull();
    expect(selectTableNumber({ status: "invalid", reason: "missing" })).toBeNull();
    expect(selectTableNumber({ status: "offline", credentials })).toBeNull();
  });
});
