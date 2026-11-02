import { describe, expect, it } from "vitest";
import { describeTableQrError } from "./table-qr-errors";

describe("describeTableQrError", () => {
  it("asks to check the connection on network errors", () => {
    expect(describeTableQrError({ kind: "network" }, "load")).toBe(
      "No pudimos cargar las mesas. Revisá tu conexión e intentá de nuevo.",
    );
  });

  it("explains a table that no longer exists", () => {
    expect(describeTableQrError({ kind: "not-found" }, "regenerate")).toBe(
      "Esa mesa ya no existe. Actualizamos la lista.",
    );
  });

  it("falls back to a generic retry message", () => {
    expect(describeTableQrError({ kind: "conflict", code: "x" }, "regenerate")).toBe(
      "No pudimos regenerar el código QR. Intentá de nuevo.",
    );
    expect(describeTableQrError({ kind: "unknown" }, "load")).toBe("No pudimos cargar las mesas. Intentá de nuevo.");
  });
});
