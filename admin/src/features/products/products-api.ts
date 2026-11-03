import type { Product } from "@/mocks/service-day";
import type { ProductCategoryOption } from "./product-catalog";
import { toProduct, toProductCategories, toProducts, type ProductBody, type ProductIssue } from "./products-mapper";

/**
 * Typed client for the API catalog (`/catalog/*` in `api/src/modules/catalog`, staff session).
 * Calls go to `/api/*`, which `next.config.ts` rewrites to `API_URL`, so the httpOnly session
 * cookie stays first-party (same pattern as `features/orders/orders-api.ts`). Product mutations
 * answer the saved product.
 */

export type ProductsApiError =
  /** 400: the API rejected the product (`issues` empty when the request shape itself was refused). */
  | { kind: "invalid"; issues: readonly ProductIssue[] }
  /** 409: the catalog forbids it right now (e.g. `product_archived`). */
  | { kind: "conflict"; code: string }
  /** 404: the product no longer exists. */
  | { kind: "not-found" }
  /** 401: no usable session cookie. */
  | { kind: "unauthorized" }
  | { kind: "network" }
  | { kind: "unknown" };

export type ProductsResult<T> = { ok: true; value: T } | { ok: false; error: ProductsApiError };

const API_BASE = "/api/catalog";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toIssues(value: unknown): ProductIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((issue): ProductIssue[] =>
    isRecord(issue) && typeof issue.path === "string" && typeof issue.code === "string"
      ? [{ path: issue.path, code: issue.code }]
      : [],
  );
}

async function toError(response: Response): Promise<ProductsApiError> {
  if (response.status === 401) return { kind: "unauthorized" };
  if (response.status === 404) return { kind: "not-found" };
  if (response.status !== 400 && response.status !== 409) return { kind: "unknown" };
  const body = await readJson(response);
  if (response.status === 400) return { kind: "invalid", issues: isRecord(body) ? toIssues(body.issues) : [] };
  return isRecord(body) && typeof body.error === "string" ? { kind: "conflict", code: body.error } : { kind: "unknown" };
}

async function request<T>(path: string, init: RequestInit, parse: (body: unknown) => T | null): Promise<ProductsResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, credentials: "same-origin" });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }
  if (!response.ok) return { ok: false, error: await toError(response) };
  const value = parse(await readJson(response));
  return value === null ? { ok: false, error: { kind: "unknown" } } : { ok: true, value };
}

function sendJson(method: "POST" | "PATCH", body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

const productPath = (id: string, action?: string) =>
  `/products/${encodeURIComponent(id)}${action === undefined ? "" : `/${action}`}`;

/** `GET /catalog/products?includeArchived=true`: the whole catalogue, so "Archivados" can list them. */
export function listProducts(): Promise<ProductsResult<Product[]>> {
  return request("/products?includeArchived=true", { method: "GET" }, toProducts);
}

/** `GET /catalog/categories`: every category by position. */
export function listProductCategories(): Promise<ProductsResult<ProductCategoryOption[]>> {
  return request("/categories", { method: "GET" }, toProductCategories);
}

/** `POST /catalog/products`: creates a product; the API generates its sku. */
export function createProduct(body: ProductBody): Promise<ProductsResult<Product>> {
  return request("/products", sendJson("POST", body), toProduct);
}

/** `PATCH /catalog/products/:id`: saves the editor fields (its option groups replace the saved ones). */
export function updateProduct(id: string, body: ProductBody): Promise<ProductsResult<Product>> {
  return request(productPath(id), sendJson("PATCH", body), toProduct);
}

/** `PATCH /catalog/products/:id` with only `available`: the 07A row switch. */
export function setProductAvailability(id: string, available: boolean): Promise<ProductsResult<Product>> {
  return request(productPath(id), sendJson("PATCH", { available }), toProduct);
}

/** `POST /catalog/products/:id/archive`. */
export function archiveProduct(id: string): Promise<ProductsResult<Product>> {
  return request(productPath(id, "archive"), { method: "POST" }, toProduct);
}

/** `POST /catalog/products/:id/restore`: back to the menu as a draft. */
export function restoreProduct(id: string): Promise<ProductsResult<Product>> {
  return request(productPath(id, "restore"), { method: "POST" }, toProduct);
}
