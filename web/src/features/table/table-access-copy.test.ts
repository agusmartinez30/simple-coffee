import { describe, expect, it } from "vitest";
import { getTableAccessView, TABLE_ACCESS_COPY } from "./table-access-copy";

const credentials = { number: "07", token: "x" };

describe("getTableAccessView", () => {
  it("shows the loading card until the QR has an answer", () => {
    expect(getTableAccessView({ status: "idle" })).toBe("checking");
    expect(getTableAccessView({ status: "checking", credentials })).toBe("checking");
  });

  it("asks to scan the QR when there is none", () => {
    expect(getTableAccessView({ status: "invalid", reason: "missing" })).toBe("missing");
  });

  it("shows the 09E unavailable session when the API rejected the QR", () => {
    expect(getTableAccessView({ status: "invalid", reason: "rejected" })).toBe("rejected");
  });

  it("shows the offline variant when the API could not answer", () => {
    expect(getTableAccessView({ status: "offline", credentials })).toBe("offline");
  });

  it("has no card for a valid table", () => {
    expect(
      getTableAccessView({
        status: "valid",
        credentials,
        table: { number: 7, label: "Mesa 07", spaceName: "Salón" },
      }),
    ).toBeNull();
  });
});

describe("TABLE_ACCESS_COPY", () => {
  it("uses the 09E copy for a rejected QR", () => {
    expect(TABLE_ACCESS_COPY.rejected).toMatchObject({
      title: "Esta sesión ya no está disponible",
      supporting: "El QR puede haber vencido o la mesa ya inició una nueva sesión.",
      cardTitle: "Sesión no disponible",
      note: "Escaneá un nuevo QR o consultá al personal.",
    });
  });

  it("only offers a retry when offline", () => {
    expect(TABLE_ACCESS_COPY.offline.retryLabel).toBeTruthy();
    expect(TABLE_ACCESS_COPY.rejected.retryLabel).toBeUndefined();
    expect(TABLE_ACCESS_COPY.missing.retryLabel).toBeUndefined();
  });
});
