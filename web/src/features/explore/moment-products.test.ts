import { describe, expect, it } from "vitest";
import { MOCK_MENU } from "@/mocks/menu";
import type { Menu } from "@/mocks/types";
import { getMomentFilters, getMomentProducts, resolveFilterId } from "./moment-products";

const ids = (products: { id: string }[]) => products.map((product) => product.id);

describe("getMomentProducts", () => {
  it("returns every moment product, in menu moment order, for Todos", () => {
    const products = getMomentProducts(MOCK_MENU, "para-desayunar", "todos");
    expect(products).toHaveLength(8);
    expect(ids(products.slice(0, 4))).toEqual([
      "tostadas-de-campo",
      "huevos-revueltos",
      "croissant",
      "combo-central",
    ]);
  });

  it("narrows to the products of the selected category", () => {
    expect(ids(getMomentProducts(MOCK_MENU, "para-tomar", "bebidas"))).toEqual(["jugo-de-naranja", "limonada"]);
  });

  it("falls back to all products for an unknown filter", () => {
    expect(getMomentProducts(MOCK_MENU, "para-desayunar", "nope")).toHaveLength(8);
  });

  it("skips moment ids the menu has no product for", () => {
    const menu: Menu = { ...MOCK_MENU, momentProductIds: { ...MOCK_MENU.momentProductIds, "para-cenar": ["ghost", "limonada"] } };
    expect(ids(getMomentProducts(menu, "para-cenar", "todos"))).toEqual(["limonada"]);
  });
});

describe("getMomentFilters", () => {
  it("offers Todos and the menu categories of the moment, in menu order", () => {
    expect(getMomentFilters(MOCK_MENU, "para-tomar")).toEqual([
      { id: "todos", label: "Todos" },
      { id: "cafes", label: "Cafés" },
      { id: "bebidas", label: "Bebidas" },
    ]);
  });

  it("only offers Todos when the moment has a single category or no products", () => {
    expect(getMomentFilters(MOCK_MENU, "para-desayunar")).toEqual([{ id: "todos", label: "Todos" }]);
    const menu: Menu = { ...MOCK_MENU, momentProductIds: { ...MOCK_MENU.momentProductIds, "para-cenar": [] } };
    expect(getMomentFilters(menu, "para-cenar")).toEqual([{ id: "todos", label: "Todos" }]);
  });
});

describe("resolveFilterId", () => {
  const filters = getMomentFilters(MOCK_MENU, "para-tomar");

  it("keeps a valid filter id", () => {
    expect(resolveFilterId(filters, "bebidas")).toBe("bebidas");
  });

  it("falls back to the first filter when missing or unknown", () => {
    expect(resolveFilterId(filters, undefined)).toBe("todos");
    expect(resolveFilterId(filters, "nope")).toBe("todos");
  });

  it("ignores repeated query values", () => {
    expect(resolveFilterId(filters, ["bebidas", "cafes"])).toBe("todos");
  });

  it("falls back to todos without filters", () => {
    expect(resolveFilterId([], "bebidas")).toBe("todos");
  });
});
