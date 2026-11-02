import { describe, expect, it } from "vitest";
import { createTableQrState, getSelectedTable, tableQrReducer, type TableQrState } from "./table-qr-state";
import type { TableQr, TablesQrConfig } from "./table-qr-types";

const table = (id: string, number: number, token: string | null): TableQr => ({
  id,
  number,
  label: `Mesa ${String(number).padStart(2, "0")}`,
  spaceId: "salon",
  spaceName: "Salón",
  enabled: true,
  qr: token === null ? null : { token, issuedAt: "2026-11-02T13:00:00.000Z", issuedBy: "María G." },
  revoked: [],
});

const CONFIG: TablesQrConfig = {
  spaces: [{ id: "salon", name: "Salón" }],
  tables: [table("tbl_01", 1, "aaaaaaaaaa"), table("tbl_07", 7, "4pX9kR2mL7")],
};

const loaded = (): TableQrState => tableQrReducer(createTableQrState(), { type: "loaded", config: CONFIG });

describe("load", () => {
  it("starts loading with no tables", () => {
    expect(createTableQrState()).toMatchObject({ load: "loading", config: { spaces: [], tables: [] }, selectedId: null });
  });

  it("selects the first table on the first load", () => {
    const state = loaded();
    expect(state.load).toBe("ready");
    expect(getSelectedTable(state)?.id).toBe("tbl_01");
  });

  it("keeps the selection on reload and drops it when the table is gone", () => {
    const selected = tableQrReducer(loaded(), { type: "select", id: "tbl_07" });
    expect(tableQrReducer(selected, { type: "loaded", config: CONFIG }).selectedId).toBe("tbl_07");
    const without = { ...CONFIG, tables: [CONFIG.tables[0]] };
    expect(tableQrReducer(selected, { type: "loaded", config: without }).selectedId).toBe("tbl_01");
  });

  it("fails the first load, but keeps the tables of a later refresh failure with a notice", () => {
    expect(tableQrReducer(createTableQrState(), { type: "load-failed", message: "x" })).toMatchObject({
      load: "failed",
      notice: null,
    });
    expect(tableQrReducer(loaded(), { type: "load-failed", message: "x" })).toMatchObject({ load: "ready", notice: "x" });
  });

  it("goes back to loading on retry", () => {
    const failed = tableQrReducer(createTableQrState(), { type: "load-failed", message: "x" });
    expect(tableQrReducer(failed, { type: "retry" }).load).toBe("loading");
  });
});

describe("regenerate", () => {
  it("asks for confirmation on the selected table, and cancels", () => {
    const asking = tableQrReducer(loaded(), { type: "open-regenerate" });
    expect(asking.confirmingRegenerate).toBe(true);
    expect(tableQrReducer(asking, { type: "cancel-regenerate" }).confirmingRegenerate).toBe(false);
  });

  it("closes the confirmation while the API rotates, then applies the new configuration", () => {
    const pending = tableQrReducer(tableQrReducer(loaded(), { type: "open-regenerate" }), {
      type: "regenerate-started",
      id: "tbl_01",
    });
    expect(pending).toMatchObject({ confirmingRegenerate: false, pendingId: "tbl_01" });

    const rotated = { ...CONFIG, tables: [table("tbl_01", 1, "bbbbbbbbbb"), CONFIG.tables[1]] };
    const done = tableQrReducer(pending, { type: "regenerate-succeeded", config: rotated, message: "ok" });
    expect(done).toMatchObject({ pendingId: null, notice: "ok", noticeTone: "success" });
    expect(getSelectedTable(done)?.qr?.token).toBe("bbbbbbbbbb");
  });

  it("reports a failed rotation", () => {
    const pending = tableQrReducer(loaded(), { type: "regenerate-started", id: "tbl_01" });
    expect(tableQrReducer(pending, { type: "regenerate-failed", message: "no" })).toMatchObject({
      pendingId: null,
      notice: "no",
      noticeTone: "danger",
    });
  });

  it("dismisses the notice", () => {
    const failed = tableQrReducer(loaded(), { type: "regenerate-failed", message: "no" });
    expect(tableQrReducer(failed, { type: "dismiss-notice" }).notice).toBeNull();
  });
});

describe("filters", () => {
  it("stores the query and space", () => {
    const state = tableQrReducer(tableQrReducer(loaded(), { type: "set-query", query: "7" }), {
      type: "set-space",
      spaceId: "salon",
    });
    expect(state.filters).toEqual({ query: "7", spaceId: "salon" });
  });
});
