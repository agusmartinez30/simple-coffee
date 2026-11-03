import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveProduct,
  createProduct,
  listProductCategories,
  listProducts,
  restoreProduct,
  setProductAvailability,
  updateProduct,
} from "./products-api";
import type { ProductBody } from "./products-mapper";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
  });
}

const apiError = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  jsonResponse(status, { statusCode: status, error, message: "irrelevant", ...extra });

const API_PRODUCT = {
  id: "ckprod1",
  sku: "CAF-001",
  name: "Latte",
  plural: null,
  description: "",
  price: 4500,
  categoryId: "cafes",
  image: null,
  moments: ["tomar"],
  publication: "draft",
  available: true,
  archived: false,
  allowCustomerNotes: true,
  position: 1,
  version: 1,
  optionGroups: [],
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
};

const BODY: ProductBody = {
  name: "Latte",
  plural: null,
  description: "",
  price: 4500,
  categoryId: "cafes",
  image: null,
  moments: ["tomar"],
  publication: "draft",
  available: true,
  allowCustomerNotes: true,
  optionGroups: [],
};

const JSON_POST = { headers: { "Content-Type": "application/json" }, credentials: "same-origin" };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listProducts", () => {
  it("gets every product, archived ones included, same-origin through the /api proxy", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [API_PRODUCT]));

    const result = await listProducts();

    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/products?includeArchived=true", {
      method: "GET",
      credentials: "same-origin",
    });
    expect(result.ok && result.value.map((product) => [product.id, product.commercialRank])).toEqual([["ckprod1", 1]]);
  });

  it("treats a malformed body as unknown", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: 1 }]));
    expect(await listProducts()).toEqual({ ok: false, error: { kind: "unknown" } });
  });

  it("reports a network failure and a missing session", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await listProducts()).toEqual({ ok: false, error: { kind: "network" } });
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { statusCode: 401, message: "Unauthorized" }));
    expect(await listProducts()).toEqual({ ok: false, error: { kind: "unauthorized" } });
  });
});

describe("listProductCategories", () => {
  it("gets the categories as select options", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: "cafes", name: "Cafés", description: "", visible: true, position: 0 }]));

    expect(await listProductCategories()).toEqual({ ok: true, value: [{ id: "cafes", label: "Cafés" }] });
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/categories", { method: "GET", credentials: "same-origin" });
  });
});

describe("product mutations", () => {
  it("creates a product with a JSON POST", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, API_PRODUCT));

    const result = await createProduct(BODY);

    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/products", { method: "POST", body: JSON.stringify(BODY), ...JSON_POST });
    expect(result.ok && result.value.id).toBe("ckprod1");
  });

  it("updates a product with a JSON PATCH of its id", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, API_PRODUCT));

    await updateProduct("ck prod/1", BODY);

    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/products/ck%20prod%2F1", {
      method: "PATCH",
      body: JSON.stringify(BODY),
      ...JSON_POST,
    });
  });

  it("patches only the availability for the list switch", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ...API_PRODUCT, available: false }));

    const result = await setProductAvailability("ckprod1", false);

    expect(fetchMock).toHaveBeenCalledWith("/api/catalog/products/ckprod1", {
      method: "PATCH",
      body: JSON.stringify({ available: false }),
      ...JSON_POST,
    });
    expect(result.ok && result.value.available).toBe(false);
  });

  it("archives and restores with a bodiless POST", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, API_PRODUCT));

    await archiveProduct("ckprod1");
    await restoreProduct("ckprod1");

    expect(fetchMock.mock.calls).toEqual([
      ["/api/catalog/products/ckprod1/archive", { method: "POST", credentials: "same-origin" }],
      ["/api/catalog/products/ckprod1/restore", { method: "POST", credentials: "same-origin" }],
    ]);
  });
});

describe("error mapping", () => {
  it("maps a domain 400 to its issues", async () => {
    fetchMock.mockResolvedValue(
      apiError(400, "invalid_product", {
        issues: [{ path: "name", code: "duplicate" }, { path: "optionGroups.0.title" }, "nope"],
      }),
    );

    expect(await createProduct(BODY)).toEqual({
      ok: false,
      error: { kind: "invalid", issues: [{ path: "name", code: "duplicate" }] },
    });
  });

  it("maps a request-shape 400 to no issues", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { statusCode: 400, message: "Validation failed", errors: {} }));
    expect(await createProduct(BODY)).toEqual({ ok: false, error: { kind: "invalid", issues: [] } });
  });

  it("maps 409 to a conflict with its code, 404 to not-found and the rest to unknown", async () => {
    fetchMock.mockResolvedValueOnce(apiError(409, "product_archived"));
    expect(await updateProduct("ckprod1", BODY)).toEqual({ ok: false, error: { kind: "conflict", code: "product_archived" } });

    fetchMock.mockResolvedValueOnce(apiError(404, "product_not_found"));
    expect(await archiveProduct("gone")).toEqual({ ok: false, error: { kind: "not-found" } });

    fetchMock.mockResolvedValueOnce(jsonResponse(409, { statusCode: 409 }));
    expect(await restoreProduct("ckprod1")).toEqual({ ok: false, error: { kind: "unknown" } });

    fetchMock.mockResolvedValueOnce(jsonResponse(500));
    expect(await restoreProduct("ckprod1")).toEqual({ ok: false, error: { kind: "unknown" } });
  });
});
