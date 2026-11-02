import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadEntryCatalog, toEntryCategories, toEntryProducts, toEntryTables } from "./entry-api";

const product = (overrides: Record<string, unknown> = {}) => ({
  id: "prod-latte",
  sku: "CAF-001",
  name: "Latte",
  description: "",
  price: 4500,
  categoryId: "cafes",
  publication: "published",
  available: true,
  archived: false,
  allowCustomerNotes: true,
  position: 1,
  version: 3,
  optionGroups: [
    {
      id: "grp-size",
      title: "Tamaño",
      selection: "single",
      required: true,
      max: 1,
      defaultOptionId: "opt-medium",
      options: [{ id: "opt-medium", name: "Mediano", priceDelta: 0 }],
    },
  ],
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  ...overrides,
});

const CATEGORIES = [
  { id: "comidas", name: "Comidas", description: "", visible: true, position: 1 },
  { id: "secreto", name: "Secreto", description: "", visible: false, position: 2 },
  { id: "cafes", name: "Cafés", description: "", visible: true, position: 0 },
];

describe("toEntryProducts", () => {
  it("keeps orderable products, by category position then product position", () => {
    const products = toEntryProducts(
      [
        product({ id: "toast", name: "Tostado", categoryId: "comidas", position: 1, optionGroups: [] }),
        product({ id: "flat", name: "Flat white", position: 2 }),
        product({ id: "draft", publication: "draft" }),
        product({ id: "off", available: false }),
        product({ id: "gone", archived: true }),
        product({ id: "latte", position: 1 }),
      ],
      CATEGORIES,
    );
    expect(products?.map((entry) => entry.id)).toEqual(["latte", "flat", "toast"]);
    expect(products?.[0]).toEqual({
      id: "latte",
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
          options: [{ id: "opt-medium", name: "Mediano", priceDelta: 0 }],
        },
      ],
    });
  });

  it("rejects an unexpected body", () => {
    expect(toEntryProducts({ products: [] }, CATEGORIES)).toBeNull();
    expect(toEntryProducts([{ id: 1 }], CATEGORIES)).toBeNull();
  });
});

describe("toEntryCategories", () => {
  it("keeps visible categories in position order", () => {
    expect(toEntryCategories(CATEGORIES)).toEqual([
      { id: "cafes", name: "Cafés" },
      { id: "comidas", name: "Comidas" },
    ]);
  });
});

describe("toEntryTables", () => {
  it("keeps enabled tables by space order, then number", () => {
    const tables = toEntryTables({
      spaces: [
        { id: "salon", name: "Salón" },
        { id: "patio", name: "Patio" },
      ],
      tables: [
        { number: 9, label: "Mesa 09", spaceId: "patio", capacity: 2, enabled: true },
        { number: 4, label: "Mesa 04", spaceId: "salon", capacity: 4, enabled: false },
        { number: 3, label: "Ventana", spaceId: "salon", capacity: 4, enabled: true },
        { number: 1, label: "Mesa 01", spaceId: "patio", capacity: 6, enabled: true },
      ],
    });
    expect(tables).toEqual([
      { number: 3, label: "Ventana", capacity: 4, spaceName: "Salón" },
      { number: 1, label: "Mesa 01", capacity: 6, spaceName: "Patio" },
      { number: 9, label: "Mesa 09", capacity: 2, spaceName: "Patio" },
    ]);
    expect(toEntryTables([])).toBeNull();
  });
});

describe("loadEntryCatalog", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads products, categories and tables same-origin through the /api proxy", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url === "/api/catalog/products") return json(200, [product()]);
      if (url === "/api/catalog/categories") return json(200, CATEGORIES);
      return json(200, { spaces: [{ id: "salon", name: "Salón" }], tables: [{ number: 2, label: "Mesa 02", spaceId: "salon", capacity: 4, enabled: true }] });
    });

    const result = await loadEntryCatalog();

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.credentials])).toEqual([
      ["/api/catalog/products", "same-origin"],
      ["/api/catalog/categories", "same-origin"],
      ["/api/tables/config", "same-origin"],
    ]);
    expect(result.ok && result.value.products.map((entry) => entry.id)).toEqual(["prod-latte"]);
    expect(result.ok && result.value.tables).toEqual([{ number: 2, label: "Mesa 02", capacity: 4, spaceName: "Salón" }]);
  });

  it("reports a lost session, a network failure or an unexpected answer", async () => {
    fetchMock.mockResolvedValue(json(401, { statusCode: 401 }));
    expect(await loadEntryCatalog()).toEqual({ ok: false, error: { kind: "unauthorized" } });

    fetchMock.mockRejectedValue(new TypeError("offline"));
    expect(await loadEntryCatalog()).toEqual({ ok: false, error: { kind: "network" } });

    fetchMock.mockResolvedValue(json(200, { unexpected: true }));
    expect(await loadEntryCatalog()).toEqual({ ok: false, error: { kind: "unknown" } });
  });
});
