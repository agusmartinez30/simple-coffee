import { describe, expect, it } from "vitest";
import { SERVICE_DAY } from "@/mocks/service-day";
import {
  PRODUCT_SHORTCUTS,
  addProduct,
  canAssignDraft,
  createDraft,
  getAssignLabel,
  getDraftSummary,
  getQuickProducts,
  getTableOptions,
  removeProduct,
  setDraftNote,
  setDraftTable,
} from "./order-draft";

const products = SERVICE_DAY.products;

describe("order draft", () => {
  it("starts empty for the chosen table", () => {
    expect(createDraft(2)).toEqual({ tableNumber: 2, lines: [], note: "" });
    expect(createDraft(null).tableNumber).toBeNull();
  });

  it("adds products one at a time, in the order they were first added", () => {
    const draft = addProduct(addProduct(addProduct(createDraft(2), "cappuccino"), "medialuna"), "cappuccino");
    expect(draft.lines).toEqual([
      { productId: "cappuccino", quantity: 2 },
      { productId: "medialuna", quantity: 1 },
    ]);
  });

  it("removes one unit and drops the line at zero", () => {
    const draft = addProduct(addProduct(createDraft(2), "cappuccino"), "medialuna");
    expect(removeProduct(draft, "cappuccino").lines).toEqual([{ productId: "medialuna", quantity: 1 }]);
    expect(removeProduct(draft, "limonada")).toBe(draft);
  });

  it("changes the table and the kitchen note", () => {
    const draft = setDraftNote(setDraftTable(createDraft(null), 5), "Sin hielo");
    expect(draft).toMatchObject({ tableNumber: 5, note: "Sin hielo" });
  });

  it("summarizes lines, item count and total as in 'Pedido actual'", () => {
    const draft = addProduct(addProduct(addProduct(createDraft(2), "cappuccino"), "medialuna"), "medialuna");
    expect(getDraftSummary(draft, products)).toEqual({
      lines: [
        { productId: "cappuccino", quantityLabel: "1×", name: "Cappuccino", subtotal: "$4.600" },
        { productId: "medialuna", quantityLabel: "2×", name: "Medialunas", subtotal: "$7.800" },
      ],
      itemCount: "3 ítems",
      total: 12400,
      totalLabel: "$12.400",
    });
    expect(getDraftSummary(addProduct(createDraft(2), "limonada"), products).itemCount).toBe("1 ítem");
    expect(getDraftSummary(createDraft(2), products)).toMatchObject({ lines: [], itemCount: "0 ítems", totalLabel: "$0" });
  });

  it("assigns only with a table and at least one product", () => {
    expect(canAssignDraft(createDraft(2))).toBe(false);
    expect(canAssignDraft(addProduct(createDraft(null), "cappuccino"))).toBe(false);
    expect(canAssignDraft(addProduct(createDraft(2), "cappuccino"))).toBe(true);
    expect(getAssignLabel(createDraft(2))).toBe("Asignar pedido a Mesa 02");
    expect(getAssignLabel(createDraft(null))).toBe("Elegí una mesa");
  });
});

describe("quick products", () => {
  it("offers the 'Categorías rápidas' of the panel", () => {
    expect(PRODUCT_SHORTCUTS.map((shortcut) => shortcut.label)).toEqual(["Frecuentes", "Cafés", "Comidas", "Extras"]);
  });

  it("lists today's best sellers first under 'Frecuentes'", () => {
    const frequent = getQuickProducts(SERVICE_DAY, { shortcut: "frequent", query: "" });
    expect(frequent).toHaveLength(4);
    const sold = (id: string) =>
      SERVICE_DAY.orders
        .filter((order) => order.sessionId.includes(SERVICE_DAY.date) && order.status !== "cancelled")
        .flatMap((order) => order.items)
        .filter((item) => item.productId === id)
        .reduce((sum, item) => sum + item.quantity, 0);
    const counts = frequent.map((product) => sold(product.id));
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(frequent[0]).toMatchObject({ name: expect.any(String), price: expect.stringMatching(/^\$/) });
  });

  it("groups the menu into coffees, food and extras", () => {
    const ids = (shortcut: "coffee" | "food" | "extras") =>
      getQuickProducts(SERVICE_DAY, { shortcut, query: "" }).map((product) => product.id);
    expect(ids("coffee")).toEqual(["cappuccino", "cappuccino-grande", "cafe-latte", "cafe-con-leche"]);
    expect(ids("food")).toEqual(["tostado-clasico", "tostado-jamon-queso", "toston-palta", "sandwich-pollo"]);
    expect(ids("extras")).toEqual(["jugo-naranja", "medialuna", "limonada"]);
  });

  it("searches the whole orderable menu, ignoring case and accents", () => {
    expect(getQuickProducts(SERVICE_DAY, { shortcut: "coffee", query: "MEDIAL" }).map((p) => p.id)).toEqual(["medialuna"]);
    expect(getQuickProducts(SERVICE_DAY, { shortcut: "food", query: "cafe" }).map((p) => p.id)).toEqual([
      "cafe-latte",
      "cafe-con-leche",
    ]);
  });

  it("never offers unavailable, draft or archived products", () => {
    const all = getQuickProducts(SERVICE_DAY, { shortcut: "frequent", query: " " });
    const offered = ["coffee", "food", "extras"].flatMap((shortcut) =>
      getQuickProducts(SERVICE_DAY, { shortcut: shortcut as "coffee", query: "" }).map((product) => product.id),
    );
    expect(offered).not.toContain("hamburguesa-clasica");
    expect(offered).not.toContain("cheesecake");
    expect(all.length).toBeGreaterThan(0);
  });
});

describe("table options", () => {
  it("labels every enabled table with its seats, by number", () => {
    const options = getTableOptions(SERVICE_DAY.tables);
    expect(options).toHaveLength(12);
    expect(options[0]).toEqual({ number: 1, label: "Mesa 01 · 2 personas" });
    expect(options[1]).toEqual({ number: 2, label: "Mesa 02 · 4 personas" });
    const disabled = SERVICE_DAY.tables.map((table) => (table.number === 1 ? { ...table, enabled: false } : table));
    expect(getTableOptions(disabled).map((option) => option.number)).not.toContain(1);
  });
});
