import { describe, expect, it } from "vitest";
import { MOCK_MENU } from "@/mocks/menu";
import { getCategoryById, getCategoryProducts } from "./category-products";

describe("getCategoryById", () => {
  it("finds a menu category", () => {
    expect(getCategoryById(MOCK_MENU, "cafes")?.label).toBe("Cafés");
  });

  it("rejects Todos and unknown ids", () => {
    expect(getCategoryById(MOCK_MENU, "todos")).toBeUndefined();
    expect(getCategoryById(MOCK_MENU, "zzz")).toBeUndefined();
  });
});

describe("getCategoryProducts", () => {
  it("returns every product of the category, in menu order", () => {
    const products = getCategoryProducts(MOCK_MENU, "cafes");
    expect(products).toHaveLength(8);
    expect(products[0].id).toBe("cappuccino");
    expect(products.every((product) => product.category === "cafes")).toBe(true);
  });
});
