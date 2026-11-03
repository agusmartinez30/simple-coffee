import { describe, expect, it } from "vitest";
import type { CartLine } from "@/features/cart";
import { MOCK_MENU } from "@/mocks/menu";
import { formatUnits, getCartLineView } from "./cart-lines";

const line = (overrides: Partial<CartLine>): CartLine => ({
  id: "x",
  productId: "cappuccino",
  choiceIds: [],
  quantity: 1,
  ...overrides,
});

describe("formatUnits", () => {
  it("uses singular and plural units", () => {
    expect(formatUnits(1)).toBe("1 unidad");
    expect(formatUnits(2)).toBe("2 unidades");
  });
});

describe("getCartLineView", () => {
  it("describes customized lines with their chosen options", () => {
    const view = getCartLineView(
      line({ choiceIds: ["mediano", "almendras"], note: "Poco caliente" }),
      MOCK_MENU,
    );
    expect(view).toMatchObject({
      name: "Cappuccino",
      image: "/images/products/cappuccino.webp",
      unitPrice: 5400,
      lineTotal: 5400,
      details: "Mediano · Leche de almendras",
      note: "Poco caliente",
    });
  });

  it("shows units and unit price for plain lines", () => {
    const view = getCartLineView(line({ productId: "medialunas", quantity: 2 }), MOCK_MENU);
    expect(view).toMatchObject({
      name: "Medialunas de manteca",
      lineTotal: 7600,
      details: "2 unidades · $3.800 c/u",
    });
  });

  it("returns null for products that no longer exist", () => {
    expect(getCartLineView(line({ productId: "ghost" }), MOCK_MENU)).toBeNull();
  });

  it("leaves the image unset for products without a photo", () => {
    const menu = {
      ...MOCK_MENU,
      products: [{ id: "agua", slug: "agua", name: "Agua", description: "", price: 1500, category: "bebidas" }],
    };
    expect(getCartLineView(line({ productId: "agua" }), menu)?.image).toBeUndefined();
  });
});
