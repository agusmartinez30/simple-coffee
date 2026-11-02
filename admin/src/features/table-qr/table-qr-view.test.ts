import { describe, expect, it } from "vitest";
import {
  QR_STATUS_LABELS,
  filterTables,
  formatAuditNumber,
  formatCredentialDate,
  getCredentialHistory,
  getQrStatus,
} from "./table-qr-view";
import type { TableQr } from "./table-qr-types";

const table = (overrides: Partial<TableQr>): TableQr => ({
  id: "tbl_07",
  number: 7,
  label: "Mesa 07",
  spaceId: "salon",
  spaceName: "Salón",
  enabled: true,
  qr: { token: "4pX9kR2mL7", issuedAt: "2026-11-02T13:00:00.000Z", issuedBy: "María G." },
  revoked: [],
  ...overrides,
});

const TABLES = [
  table({ id: "tbl_02", number: 2, label: "Mesa 02", spaceId: "terraza", spaceName: "Terraza" }),
  table({ id: "tbl_07", number: 7, label: "Mesa 07" }),
  table({ id: "tbl_12", number: 12, label: "Ventana Ñandú" }),
];

describe("getQrStatus", () => {
  it("tells active, paused (disabled table) and missing credentials apart", () => {
    expect(getQrStatus(table({}))).toBe("active");
    expect(getQrStatus(table({ enabled: false }))).toBe("paused");
    expect(getQrStatus(table({ qr: null }))).toBe("missing");
    expect(QR_STATUS_LABELS).toEqual({ active: "QR activo", paused: "QR pausado", missing: "Sin QR" });
  });
});

describe("filterTables", () => {
  const ids = (tables: readonly TableQr[]) => tables.map((item) => item.id);

  it("keeps every table without filters", () => {
    expect(ids(filterTables(TABLES, { query: "", spaceId: "all" }))).toEqual(["tbl_02", "tbl_07", "tbl_12"]);
  });

  it("filters by space", () => {
    expect(ids(filterTables(TABLES, { query: "", spaceId: "terraza" }))).toEqual(["tbl_02"]);
  });

  it("finds a table by label ignoring case and accents, or by number without the leading zero", () => {
    expect(ids(filterTables(TABLES, { query: "nandu", spaceId: "all" }))).toEqual(["tbl_12"]);
    expect(ids(filterTables(TABLES, { query: "mesa 7", spaceId: "all" }))).toEqual(["tbl_07"]);
    expect(ids(filterTables(TABLES, { query: " 12 ", spaceId: "all" }))).toEqual(["tbl_12"]);
    expect(ids(filterTables(TABLES, { query: "99", spaceId: "all" }))).toEqual([]);
  });
});

describe("formatCredentialDate", () => {
  // 13:00Z is 10:00 in the venue time zone (UTC-3).
  const now = new Date("2026-11-02T20:00:00.000Z");

  it("says hoy for the venue's current day", () => {
    expect(formatCredentialDate("2026-11-02T13:00:00.000Z", now)).toBe("hoy");
  });

  it("shows day and month otherwise, in the venue time zone", () => {
    expect(formatCredentialDate("2026-06-12T13:00:00.000Z", now)).toBe("12 jun");
    // 01:00Z on Nov 2 is still Nov 1 in Buenos Aires.
    expect(formatCredentialDate("2026-11-02T01:00:00.000Z", now)).toBe("1 nov");
  });

  it("falls back to an empty label for an invalid date", () => {
    expect(formatCredentialDate("not a date", now)).toBe("");
  });
});

describe("getCredentialHistory", () => {
  it("lists the active credential, then the rotated ones with their audit number", () => {
    const rotated = table({
      revoked: [
        {
          token: "Q7wE3rT9yU",
          issuedAt: "2026-06-12T13:00:00.000Z",
          issuedBy: "María G.",
          revokedAt: "2026-11-02T13:00:00.000Z",
          auditNumber: 118,
        },
      ],
    });
    expect(getCredentialHistory(rotated, new Date("2026-11-02T20:00:00.000Z"))).toEqual([
      { key: "4pX9kR2mL7", status: "active", label: "Activo", meta: "Generado hoy · María G." },
      { key: "Q7wE3rT9yU", status: "revoked", label: "Revocado", meta: "Rotado hoy · auditoría QR-118" },
    ]);
  });

  it("is empty for a table without credentials", () => {
    expect(getCredentialHistory(table({ qr: null }), new Date())).toEqual([]);
  });
});

describe("formatAuditNumber", () => {
  it("prefixes the audit number", () => {
    expect(formatAuditNumber(118)).toBe("QR-118");
  });
});
