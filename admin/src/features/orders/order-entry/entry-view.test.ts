import { describe, expect, it } from "vitest";
import { describeTable, filterEntryProducts, formatItemCount, formatOptionDelta, submitLabel } from "./entry-view";
import type { EntryProduct } from "./entry-types";

const product = (id: string, name: string, categoryId: string): EntryProduct => ({
  id,
  name,
  price: 1000,
  categoryId,
  allowCustomerNotes: false,
  optionGroups: [],
});

const PRODUCTS = [product("1", "Café con leche", "cafes"), product("2", "Medialuna", "panaderia"), product("3", "Cafecito", "cafes")];

describe("filterEntryProducts", () => {
  it("filters by category and by name, ignoring case and accents", () => {
    expect(filterEntryProducts(PRODUCTS, { query: "", categoryId: null })).toEqual(PRODUCTS);
    expect(filterEntryProducts(PRODUCTS, { query: "", categoryId: "panaderia" }).map((entry) => entry.id)).toEqual(["2"]);
    expect(filterEntryProducts(PRODUCTS, { query: " CAFE ", categoryId: null }).map((entry) => entry.id)).toEqual(["1", "3"]);
    expect(filterEntryProducts(PRODUCTS, { query: "leche", categoryId: "panaderia" })).toEqual([]);
  });
});

describe("labels", () => {
  it("describes a table with its space and capacity", () => {
    expect(describeTable({ number: 2, label: "Mesa 02", capacity: 4, spaceName: "Salón" })).toBe("Mesa 02 · 4 personas");
    expect(describeTable({ number: 3, label: "Ventana", capacity: 1, spaceName: "Salón" })).toBe("Mesa 03 · Ventana · 1 persona");
  });

  it("counts items and formats option deltas", () => {
    expect(formatItemCount(0)).toBe("Sin ítems");
    expect(formatItemCount(1)).toBe("1 ítem");
    expect(formatItemCount(3)).toBe("3 ítems");
    expect(formatOptionDelta(0)).toBe("Sin cargo");
    expect(formatOptionDelta(600)).toBe("+$600");
  });

  it("names the table on the submit button", () => {
    expect(submitLabel(null)).toBe("Asignar pedido");
    expect(submitLabel(7)).toBe("Asignar pedido a Mesa 07");
  });
});
