import type { CancellationReason, Order } from "./order-types";
import { toApiCancellationReason, toOrder, toOrders } from "./orders-mapper";

/**
 * Typed client for the API orders board (`/orders/*` in `api/src/modules/orders`). Calls go to
 * `/api/*`, which `next.config.ts` rewrites to `API_URL`, so the httpOnly session cookie stays
 * first-party (same pattern as `features/auth/auth-api.ts`). Every route answers the order(s)
 * with items, options and status history.
 */

/** A 400 issue: `{ path: "lines.0.optionIds", code: "required_group", groupId }`. */
export type OrdersIssue = { path: string; code: string; groupId?: string };

export type OrdersConflictCode = "invalid_transition" | "product_not_orderable" | "table_disabled";

export type OrdersApiError =
  /** 400: the API rejected the order (`issues` empty when the request shape itself was refused). */
  | { kind: "invalid"; issues: readonly OrdersIssue[] }
  /** 409: the current state forbids it (finished order, disabled table, product not orderable). */
  | { kind: "conflict"; code: OrdersConflictCode; productId?: string }
  /** 404: the order no longer exists. */
  | { kind: "not-found" }
  /** 401: no usable session cookie. */
  | { kind: "unauthorized" }
  | { kind: "network" }
  | { kind: "unknown" };

export type OrdersResult<T> = { ok: true; value: T } | { ok: false; error: OrdersApiError };

/** `POST /orders` body: a staff order for a table, priced by the API from the catalog. */
export type NewOrderInput = {
  tableNumber: number;
  customerName?: string | null;
  note?: string | null;
  lines: { productId: string; quantity: number; optionIds?: string[]; note?: string | null }[];
};

const API_BASE = "/api/orders";

const CONFLICT_CODES: readonly OrdersConflictCode[] = ["invalid_transition", "product_not_orderable", "table_disabled"];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toIssues(value: unknown): OrdersIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((issue): OrdersIssue[] => {
    if (!isRecord(issue) || typeof issue.path !== "string" || typeof issue.code !== "string") return [];
    return [typeof issue.groupId === "string" ? { path: issue.path, code: issue.code, groupId: issue.groupId } : { path: issue.path, code: issue.code }];
  });
}

async function toError(response: Response): Promise<OrdersApiError> {
  if (response.status === 401) return { kind: "unauthorized" };
  if (response.status === 404) return { kind: "not-found" };
  if (response.status !== 400 && response.status !== 409) return { kind: "unknown" };
  const body = await readJson(response);
  if (response.status === 400) return { kind: "invalid", issues: isRecord(body) ? toIssues(body.issues) : [] };
  const code = isRecord(body) ? body.error : undefined;
  if (!CONFLICT_CODES.includes(code as OrdersConflictCode)) return { kind: "unknown" };
  // `product_not_orderable` names the product, so the order entry can point at its line.
  const productId = isRecord(body) && typeof body.productId === "string" ? body.productId : undefined;
  return productId === undefined
    ? { kind: "conflict", code: code as OrdersConflictCode }
    : { kind: "conflict", code: code as OrdersConflictCode, productId };
}

async function request<T>(path: string, init: RequestInit, parse: (body: unknown) => T | null): Promise<OrdersResult<T>> {
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

function postJson(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

const orderPath = (id: string, action: string) => `/${encodeURIComponent(id)}/${action}`;

/** `GET /orders`: the orders of the service day `date` ("YYYY-MM-DD"), today when omitted. */
export function listOrders(date?: string): Promise<OrdersResult<Order[]>> {
  const query = date === undefined ? "" : `?${new URLSearchParams({ date })}`;
  return request(query, { method: "GET" }, toOrders);
}

/** `POST /orders`: creates a staff order. */
export function createOrder(input: NewOrderInput): Promise<OrdersResult<Order>> {
  return request("", postJson(input), toOrder);
}

/** `POST /orders/:id/advance`: received → preparing → delivered. */
export function advanceOrder(id: string): Promise<OrdersResult<Order>> {
  return request(orderPath(id, "advance"), { method: "POST" }, toOrder);
}

/** `POST /orders/:id/cancel`: cancels a received or preparing order with a reason. */
export function cancelOrder(id: string, reason: CancellationReason): Promise<OrdersResult<Order>> {
  return request(orderPath(id, "cancel"), postJson({ reason: toApiCancellationReason(reason) }), toOrder);
}
