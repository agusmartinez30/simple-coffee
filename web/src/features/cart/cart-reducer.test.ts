import { describe, expect, it } from "vitest";
import { MOCK_MENU } from "@/mocks/menu";
import {
  cartReducer,
  emptyCart,
  getLineKey,
  parseStoredCart,
  selectItemCount,
  selectSubtotal,
  type CartState,
} from "./cart-reducer";

function add(state: CartState, productId: string, choiceIds: string[] = [], quantity = 1, note?: string) {
  return cartReducer(state, { type: "add", productId, choiceIds, quantity, note });
}

describe("cartReducer", () => {
  it("adds a new line", () => {
    const state = add(emptyCart, "espresso-doble");
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]).toMatchObject({ productId: "espresso-doble", quantity: 1, choiceIds: [] });
  });

  it("merges identical lines regardless of choice order", () => {
    let state = add(emptyCart, "cappuccino", ["mediano", "entera"]);
    state = add(state, "cappuccino", ["entera", "mediano"], 2);
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].quantity).toBe(3);
  });

  it("keeps lines apart when choices or notes differ", () => {
    let state = add(emptyCart, "cappuccino", ["mediano", "entera"]);
    state = add(state, "cappuccino", ["grande", "entera"]);
    state = add(state, "cappuccino", ["mediano", "entera"], 1, "Bien caliente");
    expect(state.lines).toHaveLength(3);
  });

  it("treats blank notes as no note", () => {
    let state = add(emptyCart, "croissant");
    state = add(state, "croissant", [], 1, "   ");
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].note).toBeUndefined();
  });

  it("ignores adds with a non-positive quantity", () => {
    expect(add(emptyCart, "croissant", [], 0)).toBe(emptyCart);
  });

  it("increments and decrements a line", () => {
    let state = add(emptyCart, "croissant");
    const lineId = state.lines[0].id;
    state = cartReducer(state, { type: "increment", lineId });
    expect(state.lines[0].quantity).toBe(2);
    state = cartReducer(state, { type: "decrement", lineId });
    expect(state.lines[0].quantity).toBe(1);
  });

  it("removes the line when decremented from one", () => {
    let state = add(emptyCart, "croissant");
    state = cartReducer(state, { type: "decrement", lineId: state.lines[0].id });
    expect(state.lines).toHaveLength(0);
  });

  it("removes a line and clears the cart", () => {
    let state = add(emptyCart, "croissant");
    state = add(state, "medialunas");
    state = cartReducer(state, { type: "remove", lineId: state.lines[0].id });
    expect(state.lines.map((line) => line.productId)).toEqual(["medialunas"]);
    expect(cartReducer(state, { type: "clear" })).toEqual(emptyCart);
  });

  it("replaces the state on hydrate", () => {
    const stored = add(emptyCart, "latte", [], 2);
    expect(cartReducer(emptyCart, { type: "hydrate", state: stored })).toEqual(stored);
  });
});

describe("cart selectors", () => {
  it("counts items across lines", () => {
    let state = add(emptyCart, "croissant", [], 2);
    state = add(state, "medialunas");
    expect(selectItemCount(state)).toBe(3);
  });

  it("computes the subtotal from menu unit prices", () => {
    // Cappuccino Grande (4500 + 700) with almond milk (+900) x2 + Medialunas 3800
    let state = add(emptyCart, "cappuccino", ["grande", "almendras"], 2);
    state = add(state, "medialunas");
    expect(selectSubtotal(state, MOCK_MENU)).toBe((4500 + 700 + 900) * 2 + 3800);
  });

  it("ignores lines whose product no longer exists", () => {
    const state = add(emptyCart, "ghost-product");
    expect(selectSubtotal(state, MOCK_MENU)).toBe(0);
  });

  it("builds stable line keys", () => {
    expect(getLineKey("cappuccino", ["b", "a"])).toBe(getLineKey("cappuccino", ["a", "b"]));
  });
});

describe("parseStoredCart", () => {
  it("restores a valid stored cart", () => {
    const state = add(emptyCart, "latte");
    expect(parseStoredCart(JSON.stringify(state))).toEqual(state);
  });

  it("falls back to an empty cart on invalid data", () => {
    expect(parseStoredCart(null)).toEqual(emptyCart);
    expect(parseStoredCart("not json")).toEqual(emptyCart);
    expect(parseStoredCart(JSON.stringify({ lines: [{ productId: 3 }] }))).toEqual(emptyCart);
  });
});
