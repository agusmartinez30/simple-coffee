import { describe, expect, it } from "vitest";
import type { CartLine } from "./cart";
import { describeCreateOrderError, describeLoadError } from "./entry-errors";

const line = (productId: string, name: string): CartLine => ({
  key: `${productId}|`,
  productId,
  name,
  unitPrice: 1000,
  optionIds: [],
  optionSummary: "",
  allowsNote: false,
  quantity: 1,
  note: "",
});

const LINES = [line("prod-latte", "Latte"), line("prod-toast", "Tostado")];

describe("describeCreateOrderError", () => {
  it("names the product that can no longer be ordered", () => {
    expect(describeCreateOrderError({ kind: "conflict", code: "product_not_orderable", productId: "prod-toast" }, LINES, 3)).toBe(
      "Tostado ya no se puede pedir. Quitalo del pedido para continuar.",
    );
    expect(describeCreateOrderError({ kind: "conflict", code: "product_not_orderable" }, LINES, 3)).toBe(
      "Un producto del pedido ya no se puede pedir. Revisá el pedido.",
    );
  });

  it("explains a disabled table", () => {
    expect(describeCreateOrderError({ kind: "conflict", code: "table_disabled" }, LINES, 3)).toBe(
      "La Mesa 03 está deshabilitada. Elegí otra mesa.",
    );
  });

  it("maps invalid_order issues, naming their lines, without repeating messages", () => {
    expect(
      describeCreateOrderError(
        {
          kind: "invalid",
          issues: [
            { path: "lines.1.optionIds", code: "missing_required_group", groupId: "grp-bread" },
            { path: "lines.1.optionIds.0", code: "unknown_option" },
            { path: "lines.0.productId", code: "unknown_product" },
            { path: "tableNumber", code: "unknown_table" },
            { path: "note", code: "too_long" },
          ],
        },
        LINES,
        3,
      ),
    ).toBe(
      "Revisá las opciones de Tostado. Latte ya no está en la carta. Quitalo del pedido. Esa mesa ya no existe. Elegí otra. La nota para cocina admite hasta 140 caracteres.",
    );
    expect(describeCreateOrderError({ kind: "invalid", issues: [{ path: "lines.0.quantity", code: "out_of_range" }] }, LINES, 3)).toBe(
      "Las cantidades van de 1 a 99.",
    );
    expect(describeCreateOrderError({ kind: "invalid", issues: [{ path: "lines.0.note", code: "not_allowed" }] }, LINES, 3)).toBe(
      "Latte no admite notas. Borrá la nota de esa línea.",
    );
    expect(describeCreateOrderError({ kind: "invalid", issues: [] }, LINES, 3)).toBe("Revisá el pedido e intentá de nuevo.");
  });

  it("falls back to a generic message", () => {
    expect(describeCreateOrderError({ kind: "network" }, LINES, 3)).toBe(
      "No pudimos crear el pedido. Revisá tu conexión e intentá de nuevo.",
    );
    expect(describeCreateOrderError({ kind: "unknown" }, LINES, 3)).toBe("No pudimos crear el pedido. Intentá de nuevo.");
  });
});

describe("describeLoadError", () => {
  it("tells a network failure apart", () => {
    expect(describeLoadError({ kind: "network" })).toBe("No pudimos cargar la carta y las mesas. Revisá tu conexión e intentá de nuevo.");
    expect(describeLoadError({ kind: "unknown" })).toBe("No pudimos cargar la carta y las mesas. Intentá de nuevo.");
  });
});
