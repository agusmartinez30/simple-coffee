import { describe, expect, it } from "vitest";
import { API_CONFIG } from "./table-qr-fixtures";
import { toTablesQrConfig } from "./table-qr-mapper";

describe("toTablesQrConfig", () => {
  it("maps tables by number with their space name and active credential", () => {
    const config = toTablesQrConfig(API_CONFIG);

    expect(config?.spaces).toEqual([
      { id: "salon", name: "Salón" },
      { id: "terraza", name: "Terraza" },
    ]);
    expect(config?.tables).toEqual([
      {
        id: "tbl_02",
        number: 2,
        label: "Mesa 02",
        spaceId: "terraza",
        spaceName: "Terraza",
        enabled: false,
        qr: null,
        revoked: [],
      },
      {
        id: "tbl_07",
        number: 7,
        label: "Mesa 07",
        spaceId: "salon",
        spaceName: "Salón",
        enabled: true,
        qr: { token: "4pX9kR2mL7", issuedAt: "2026-11-02T13:00:00.000Z", issuedBy: "María G." },
        revoked: [
          {
            token: "Q7wE3rT9yU",
            issuedAt: "2026-06-12T13:00:00.000Z",
            issuedBy: "María G.",
            revokedAt: "2026-11-02T13:00:00.000Z",
            auditNumber: 118,
          },
        ],
      },
    ]);
  });

  it("leaves the space name empty when the space is unknown", () => {
    const body = { spaces: [], tables: [API_CONFIG.tables[1]] };
    expect(toTablesQrConfig(body)?.tables[0]?.spaceName).toBe("");
  });

  it("rejects malformed bodies", () => {
    expect(toTablesQrConfig(null)).toBeNull();
    expect(toTablesQrConfig({ spaces: [], tables: [{ id: "tbl_01" }] })).toBeNull();
    expect(
      toTablesQrConfig({ spaces: [], tables: [{ ...API_CONFIG.tables[0], qr: { token: 7 } }] }),
    ).toBeNull();
    expect(toTablesQrConfig({ spaces: [{ id: 1 }], tables: [] })).toBeNull();
  });
});
