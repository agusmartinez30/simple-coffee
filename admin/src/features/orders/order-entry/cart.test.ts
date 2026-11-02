import { describe, expect, it } from "vitest";
import {
  LINE_QUANTITY_MAX,
  buildOrderInput,
  canSubmitCart,
  cartItemCount,
  cartReducer,
  cartTotal,
  clearGroupSelection,
  createCart,
  initialOptionSelection,
  optionIssues,
  toLine,
  toggleOption,
  type CartState,
} from "./cart";
import type { EntryProduct } from "./entry-types";

const LATTE: EntryProduct = {
  id: "prod-latte",
  name: "Latte",
  price: 4500,
  categoryId: "cafes",
  allowCustomerNotes: true,
  optionGroups: [
    {
      id: "grp-size",
      title: "Tamaño",
      selection: "single",
      required: true,
      max: 1,
      defaultOptionId: "opt-medium",
      options: [
        { id: "opt-medium", name: "Mediano", priceDelta: 0 },
        { id: "opt-large", name: "Grande", priceDelta: 600 },
      ],
    },
    {
      id: "grp-milk",
      title: "Leche",
      selection: "single",
      required: false,
      max: 1,
      defaultOptionId: null,
      options: [
        { id: "opt-oat", name: "Avena", priceDelta: 400 },
        { id: "opt-lactose-free", name: "Deslactosada", priceDelta: 0 },
      ],
    },
    {
      id: "grp-extras",
      title: "Extras",
      selection: "multiple",
      required: false,
      max: 2,
      defaultOptionId: null,
      options: [
        { id: "opt-shot", name: "Shot extra", priceDelta: 700 },
        { id: "opt-cream", name: "Crema", priceDelta: 300 },
        { id: "opt-syrup", name: "Jarabe", priceDelta: 250 },
      ],
    },
  ],
};

const MEDIALUNA: EntryProduct = {
  id: "prod-medialuna",
  name: "Medialuna",
  price: 1900,
  categoryId: "panaderia",
  allowCustomerNotes: false,
  optionGroups: [],
};

const TOAST: EntryProduct = {
  id: "prod-toast",
  name: "Tostado",
  price: 5200,
  categoryId: "comidas",
  allowCustomerNotes: false,
  optionGroups: [
    {
      id: "grp-bread",
      title: "Pan",
      selection: "single",
      required: true,
      max: 1,
      defaultOptionId: null,
      options: [{ id: "opt-white", name: "Blanco", priceDelta: 0 }],
    },
  ],
};

const add = (state: CartState, product: EntryProduct, optionIds: string[] = []) =>
  cartReducer(state, { type: "add", product, optionIds });

describe("option selection", () => {
  it("preselects the default option of required groups only", () => {
    expect(initialOptionSelection(LATTE)).toEqual(["opt-medium"]);
    expect(initialOptionSelection(TOAST)).toEqual([]);
    expect(initialOptionSelection(MEDIALUNA)).toEqual([]);
  });

  it("replaces the choice of a single group", () => {
    expect(toggleOption(LATTE, ["opt-medium"], "opt-large")).toEqual(["opt-large"]);
    expect(toggleOption(LATTE, ["opt-medium"], "opt-oat")).toEqual(["opt-medium", "opt-oat"]);
  });

  it("toggles multiple options up to the group max", () => {
    let selection = toggleOption(LATTE, [], "opt-shot");
    selection = toggleOption(LATTE, selection, "opt-cream");
    expect(selection).toEqual(["opt-shot", "opt-cream"]);
    expect(toggleOption(LATTE, selection, "opt-syrup")).toEqual(selection);
    expect(toggleOption(LATTE, selection, "opt-shot")).toEqual(["opt-cream"]);
  });

  it("clears an optional group", () => {
    expect(clearGroupSelection(LATTE, ["opt-medium", "opt-oat"], "grp-milk")).toEqual(["opt-medium"]);
  });

  it("previews the unit price with the required defaults filled in", () => {
    expect(toLine(LATTE, ["opt-oat"]).unitPrice).toBe(4900);
    expect(toLine(LATTE, ["opt-oat"]).optionSummary).toBe("Mediano · Avena");
  });

  it("ignores options of other products", () => {
    expect(toggleOption(LATTE, ["opt-medium"], "opt-white")).toEqual(["opt-medium"]);
  });
});

describe("optionIssues", () => {
  it("accepts a valid selection", () => {
    expect(optionIssues(LATTE, ["opt-large", "opt-shot"])).toEqual([]);
    expect(optionIssues(MEDIALUNA, [])).toEqual([]);
  });

  it("lets a required group with a default go empty, like the API", () => {
    expect(optionIssues(LATTE, [])).toEqual([]);
  });

  it("mirrors the API rules", () => {
    expect(optionIssues(TOAST, [])).toEqual([{ code: "missing_required_group", groupId: "grp-bread" }]);
    expect(optionIssues(LATTE, ["opt-medium", "opt-large"])).toEqual([{ code: "too_many_options", groupId: "grp-size" }]);
    expect(optionIssues(LATTE, ["opt-shot", "opt-cream", "opt-syrup"])).toEqual([
      { code: "too_many_options", groupId: "grp-extras" },
    ]);
    expect(optionIssues(LATTE, ["opt-white", "opt-shot", "opt-shot"])).toEqual([
      { code: "unknown_option", optionId: "opt-white" },
      { code: "duplicate_option", optionId: "opt-shot" },
    ]);
  });
});

describe("cartReducer", () => {
  it("adds a line priced with its option deltas and a readable summary", () => {
    const state = add(createCart(), LATTE, ["opt-shot", "opt-large"]);
    expect(state.lines).toEqual([
      {
        key: "prod-latte|opt-large,opt-shot",
        productId: "prod-latte",
        name: "Latte",
        unitPrice: 5800,
        optionIds: ["opt-large", "opt-shot"],
        optionSummary: "Grande · Shot extra",
        allowsNote: true,
        quantity: 1,
        note: "",
      },
    ]);
  });

  it("merges identical product and options into one line", () => {
    let state = add(createCart(), LATTE, ["opt-large", "opt-shot"]);
    state = add(state, LATTE, ["opt-shot", "opt-large"]);
    state = add(state, LATTE, ["opt-medium"]);
    expect(state.lines.map((line) => [line.key, line.quantity])).toEqual([
      ["prod-latte|opt-large,opt-shot", 2],
      ["prod-latte|opt-medium", 1],
    ]);
  });

  it("refuses lines whose options break the rules", () => {
    const state = createCart();
    expect(add(state, TOAST, [])).toBe(state);
    expect(add(state, LATTE, ["opt-medium", "opt-large"])).toBe(state);
  });

  it("keeps quantities between 1 and 99", () => {
    let state = add(createCart(), MEDIALUNA);
    const key = state.lines[0].key;
    state = cartReducer(state, { type: "decrement", key });
    expect(state.lines[0].quantity).toBe(1);
    for (let i = 0; i < 120; i += 1) state = cartReducer(state, { type: "increment", key });
    expect(state.lines[0].quantity).toBe(LINE_QUANTITY_MAX);
    state = add(state, MEDIALUNA);
    expect(state.lines[0].quantity).toBe(LINE_QUANTITY_MAX);
    state = cartReducer(state, { type: "decrement", key });
    expect(state.lines[0].quantity).toBe(98);
  });

  it("removes a line", () => {
    let state = add(add(createCart(), MEDIALUNA), LATTE);
    state = cartReducer(state, { type: "remove", key: "prod-medialuna|" });
    expect(state.lines.map((line) => line.productId)).toEqual(["prod-latte"]);
  });

  it("keeps line notes only on products that accept them", () => {
    let state = add(add(createCart(), MEDIALUNA), LATTE);
    state = cartReducer(state, { type: "set-line-note", key: "prod-medialuna|", note: "tibia" });
    state = cartReducer(state, { type: "set-line-note", key: "prod-latte|opt-medium", note: "bien caliente" });
    expect(state.lines.map((line) => line.note)).toEqual(["", "bien caliente"]);
  });

  it("selects the table and the order note, and resets", () => {
    let state = cartReducer(createCart(), { type: "select-table", tableNumber: 7 });
    state = cartReducer(state, { type: "set-note", note: "Sin apuro" });
    state = add(state, MEDIALUNA);
    expect(state.tableNumber).toBe(7);
    expect(state.note).toBe("Sin apuro");
    expect(cartReducer(state, { type: "reset" })).toEqual(createCart());
  });
});

describe("totals and request", () => {
  const filled = () => {
    let state = add(createCart(), LATTE, ["opt-large", "opt-oat"]);
    state = add(state, MEDIALUNA);
    state = add(state, MEDIALUNA);
    return state;
  };

  it("sums (price + deltas) × quantity and counts items", () => {
    const state = filled();
    expect(cartTotal(state.lines)).toBe(5500 + 2 * 1900);
    expect(cartItemCount(state.lines)).toBe(3);
    expect(cartTotal([])).toBe(0);
  });

  it("needs a table and at least one line to submit", () => {
    expect(canSubmitCart(createCart())).toBe(false);
    expect(canSubmitCart(filled())).toBe(false);
    expect(canSubmitCart(cartReducer(createCart(), { type: "select-table", tableNumber: 2 }))).toBe(false);
    expect(canSubmitCart(cartReducer(filled(), { type: "select-table", tableNumber: 2 }))).toBe(true);
    expect(buildOrderInput(filled())).toBeNull();
  });

  it("builds the POST /orders body with trimmed notes and without empty fields", () => {
    let state = cartReducer(filled(), { type: "select-table", tableNumber: 2 });
    state = cartReducer(state, { type: "set-line-note", key: "prod-latte|opt-large,opt-oat", note: "  sin espuma " });
    state = cartReducer(state, { type: "set-note", note: "  " });
    expect(buildOrderInput(state)).toEqual({
      tableNumber: 2,
      lines: [
        { productId: "prod-latte", quantity: 1, optionIds: ["opt-large", "opt-oat"], note: "sin espuma" },
        { productId: "prod-medialuna", quantity: 2 },
      ],
    });
    state = cartReducer(state, { type: "set-note", note: " Mesa con cochecito " });
    expect(buildOrderInput(state)?.note).toBe("Mesa con cochecito");
  });
});
