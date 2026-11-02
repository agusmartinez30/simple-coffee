import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTablesConfig, regenerateQr } from "./table-qr-api";
import { API_CONFIG } from "./table-qr-fixtures";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

const apiError = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  jsonResponse(status, { statusCode: status, error, message: "irrelevant", ...extra });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getTablesConfig", () => {
  it("gets the configuration same-origin through the /api proxy", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, API_CONFIG));

    const result = await getTablesConfig();

    expect(fetchMock).toHaveBeenCalledWith("/api/tables/config", { method: "GET", credentials: "same-origin" });
    expect(result.ok && result.value.tables.map((table) => [table.id, table.qr?.token ?? null])).toEqual([
      ["tbl_02", null],
      ["tbl_07", "4pX9kR2mL7"],
    ]);
  });

  it("treats a malformed body as unknown", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { spaces: "nope" }));
    expect(await getTablesConfig()).toEqual({ ok: false, error: { kind: "unknown" } });
  });

  it("reports a missing session", async () => {
    fetchMock.mockResolvedValue(apiError(401, "invalid_session"));
    expect(await getTablesConfig()).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });

  it("reports a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await getTablesConfig()).toEqual({ ok: false, error: { kind: "network" } });
  });
});

describe("regenerateQr", () => {
  it("posts the rotation and answers the updated configuration", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, API_CONFIG));

    const result = await regenerateQr("tbl_07");

    expect(fetchMock).toHaveBeenCalledWith("/api/tables/tbl_07/qr/regenerate", {
      method: "POST",
      credentials: "same-origin",
    });
    expect(result.ok && result.value.tables).toHaveLength(2);
  });

  it("encodes the table id", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, API_CONFIG));
    await regenerateQr("tbl 7/x");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/tables/tbl%207%2Fx/qr/regenerate");
  });

  it("maps 404, 400 and 409 refusals", async () => {
    fetchMock.mockResolvedValueOnce(apiError(404, "table_not_found"));
    expect(await regenerateQr("tbl_99")).toEqual({ ok: false, error: { kind: "not-found" } });

    fetchMock.mockResolvedValueOnce(apiError(400, "invalid_table", { issues: [{ path: "label", code: "required" }, { bad: 1 }] }));
    expect(await regenerateQr("tbl_07")).toEqual({
      ok: false,
      error: { kind: "invalid", issues: [{ path: "label", code: "required" }] },
    });

    fetchMock.mockResolvedValueOnce(apiError(409, "table_has_open_session"));
    expect(await regenerateQr("tbl_07")).toEqual({ ok: false, error: { kind: "conflict", code: "table_has_open_session" } });

    fetchMock.mockResolvedValueOnce(apiError(500, "boom"));
    expect(await regenerateQr("tbl_07")).toEqual({ ok: false, error: { kind: "unknown" } });
  });
});
