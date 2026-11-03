import { describe, expect, it } from "vitest";
import { PRODUCTS, type Product } from "@/mocks/service-day";
import {
  createProductsState,
  getDuplicateRequest,
  getEditorView,
  getProductsListView,
  getSaveRequest,
  productsReducer,
  type ProductsAction,
  type ProductsState,
} from "./products-state";

const CATEGORIES = [
  { id: "cafes", label: "Cafés" },
  { id: "brunch", label: "Brunch" },
];

const api = (product: Product, overrides: Partial<Product> = {}): Product => ({ ...product, ...overrides });
const cappuccino = PRODUCTS.find((product) => product.id === "cappuccino")!;
const run = (state: ProductsState, ...actions: ProductsAction[]): ProductsState => actions.reduce(productsReducer, state);
const loaded = (products: Product[] = PRODUCTS) =>
  run(createProductsState([]), { type: "loaded", products, categories: CATEGORIES });

describe("loading from the API", () => {
  it("replaces the products and the categories the filters and the editor offer", () => {
    const toast = api(cappuccino, { id: "ck-toast", name: "Tostón", categoryId: "brunch" });
    const state = loaded([toast]);
    const view = getProductsListView(state);
    expect(view.rows.map((row) => [row.name, row.metaLabel])).toEqual([["Tostón", `Brunch · SKU ${cappuccino.sku}`]]);
    expect(view.categoryOptions).toEqual([{ id: "all", label: "Categoría" }, ...CATEGORIES]);
    expect(getProductsListView(run(state, { type: "set-query", query: "brunch" })).total).toBe(1);

    const editor = getEditorView(run(state, { type: "open-editor", id: "ck-toast" }))!;
    expect(editor.categories).toEqual(CATEGORIES);
    expect(editor.preview.categoryLabel).toBe("Brunch");
  });

  it("keeps the mock categories by default", () => {
    expect(getProductsListView(createProductsState(PRODUCTS)).categoryOptions[1]).toEqual({ id: "cafes", label: "Cafés" });
  });
});

describe("saving through the API", () => {
  it("builds no request for a blocked draft", () => {
    const state = run(loaded(), { type: "open-editor", id: "cappuccino" }, { type: "set-field", field: "name", value: "" });
    expect(getSaveRequest(state, "publish")).toBeNull();
  });

  it("builds the PATCH body of an edited product with its publication", () => {
    const state = run(loaded(), { type: "open-editor", id: "cappuccino" }, { type: "toggle-moment", moment: "tomar" });
    const request = getSaveRequest(state, "draft")!;
    expect(request.productId).toBe("cappuccino");
    expect(request.body).toMatchObject({ name: "Cappuccino", publication: "draft", moments: [...cappuccino.moments, "tomar"] });
    expect(request.body.optionGroups[0]).toMatchObject({ id: cappuccino.optionGroups[0].id });
  });

  it("builds the POST body of a new product without group or option ids", () => {
    const state = run(
      loaded(),
      { type: "open-new" },
      { type: "set-field", field: "name", value: "Té verde" },
      { type: "set-field", field: "price", value: "3.200" },
      { type: "set-category", categoryId: "brunch" },
      { type: "add-group" },
      { type: "rename-group", groupId: "grupo-1", title: "Leche" },
      { type: "add-option", groupId: "grupo-1" },
      { type: "update-option", groupId: "grupo-1", id: "opcion-1", changes: { name: "Avena", priceDelta: "700" } },
    );
    const request = getSaveRequest(state, "draft")!;
    expect(request.productId).toBeNull();
    expect(request.body).toMatchObject({ name: "Té verde", price: 3200, categoryId: "brunch", publication: "draft" });
    expect(request.body.optionGroups).toEqual([
      { title: "Leche", selection: "multiple", required: false, max: null, defaultOption: null, options: [{ name: "Avena", priceDelta: 700 }] },
    ]);
  });

  it("commits the product the API answers and reopens the editor on it", () => {
    const state = run(loaded(), { type: "open-new" }, { type: "save-started" });
    expect(getEditorView(state)?.saveTitle).toBe("Guardando…");
    const saved = api(cappuccino, { id: "ck-new", name: "Té verde", publication: "published" });

    const next = run(state, { type: "save-succeeded", product: saved, mode: "publish" });

    expect(next.products.at(-1)).toBe(saved);
    expect(next.version).toBe(state.version + 1);
    expect(next.editor).toMatchObject({ productId: "ck-new", saving: false });
    expect(next.notice).toBe("Té verde se publicó en la carta.");
    expect(getEditorView(next)).toMatchObject({ dirty: false, title: "Editar producto" });
  });

  it("replaces an edited product in place", () => {
    const state = run(loaded(), { type: "open-editor", id: "cappuccino" }, { type: "save-started" });
    const saved = api(cappuccino, { price: 9999, publication: "draft" });
    const next = run(state, { type: "save-succeeded", product: saved, mode: "draft" });
    expect(next.products.find((product) => product.id === "cappuccino")).toBe(saved);
    expect(next.products).toHaveLength(PRODUCTS.length);
    expect(next.notice).toBe("Cappuccino se guardó como borrador y no se muestra en la carta.");
  });

  it("shows the API field errors after a rejected save", () => {
    const state = run(loaded(), { type: "open-editor", id: "cappuccino" }, { type: "save-started" });
    const next = run(state, { type: "save-failed", issues: [{ path: "name", code: "duplicate" }] });
    expect(next.editor?.saving).toBe(false);
    expect(getEditorView(next)).toMatchObject({
      errors: { name: "Ya existe un producto con ese nombre." },
      saveTone: "danger",
      saveTitle: "Revisá los campos marcados antes de guardar.",
    });
    // Typing again clears them.
    expect(getEditorView(run(next, { type: "set-field", field: "name", value: "Capuchino" }))?.errors).toEqual({});
  });

  it("shows 'No se pudo guardar' when the API fails without field errors", () => {
    const state = run(loaded(), { type: "open-editor", id: "cappuccino" }, { type: "save-started" });
    const next = run(state, { type: "save-failed", issues: [] });
    expect(next.notice).toBe("No se pudo guardar Cappuccino. Intentá de nuevo.");
    expect(getEditorView(next)).toMatchObject({ saveTitle: "No se pudo guardar el producto. Intentá de nuevo.", saveTone: "danger" });
    expect(next.products).toEqual(PRODUCTS);
  });
});

describe("list actions through the API", () => {
  it("builds the POST body of a copy: next free name, draft, no plural, no ids", () => {
    const body = getDuplicateRequest(loaded(), "cappuccino")!;
    expect(body).toMatchObject({ name: "Cappuccino (copia)", publication: "draft", plural: null, price: cappuccino.price });
    expect(body.optionGroups.every((group) => !("id" in group))).toBe(true);
    expect(getDuplicateRequest(loaded(), "missing")).toBeNull();
  });

  it("inserts the API copy right after its original", () => {
    const copy = api(cappuccino, { id: "ck-copy", name: "Cappuccino (copia)", publication: "draft" });
    const next = run(loaded(), { type: "duplicated", sourceId: "cappuccino", product: copy });
    const index = next.products.findIndex((product) => product.id === "cappuccino");
    expect(next.products[index + 1]).toBe(copy);
    expect(next.notice).toBe("Se creó Cappuccino (copia) como borrador.");
  });

  it("commits archived and restored products as the API answers them", () => {
    const archived = run(loaded(), { type: "archived", product: api(cappuccino, { archived: true }) });
    expect(archived.products.find((product) => product.id === "cappuccino")?.archived).toBe(true);
    expect(archived.notice).toBe("Cappuccino se archivó. Podés restaurarlo desde el filtro Archivados.");

    const restored = run(archived, { type: "restored", product: api(cappuccino, { publication: "draft" }) });
    expect(restored.products.find((product) => product.id === "cappuccino")).toMatchObject({ archived: false, publication: "draft" });
    expect(restored.notice).toBe("Cappuccino volvió a la carta como borrador.");
  });

  it("announces a failed list action", () => {
    expect(run(loaded(), { type: "product-action-failed", id: "cappuccino", action: "archive" }).notice).toBe(
      "No se pudo archivar Cappuccino. Intentá de nuevo.",
    );
  });

  it("commits the availability the API answers", () => {
    const saved = api(cappuccino, { available: false, sku: "CAF-999" });
    const next = run(
      loaded(),
      { type: "start-availability-save", id: "cappuccino", available: false },
      { type: "finish-availability-save", id: "cappuccino", ok: true, product: saved },
    );
    expect(next.products.find((product) => product.id === "cappuccino")).toBe(saved);
    expect(next.availabilitySaves).toEqual({});
  });
});
