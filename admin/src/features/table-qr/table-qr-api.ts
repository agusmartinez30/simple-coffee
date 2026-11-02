import { toTablesQrConfig } from "./table-qr-mapper";
import type { TablesQrConfig } from "./table-qr-types";

/**
 * Typed client for the table QR routes of the API (`/tables/*` in `api/src/modules/tables`).
 * Calls go to `/api/*`, which `next.config.ts` rewrites to `API_URL`, so the httpOnly session
 * cookie stays first-party (same pattern as `features/orders/orders-api.ts`). Both routes answer
 * the full `{ spaces, tables }` configuration.
 */

/** A 400 issue: `{ path: "label", code: "required" }`. */
export type TableQrIssue = { path: string; code: string };

export type TableQrApiError =
  /** 400: the API rejected the request. */
  | { kind: "invalid"; issues: readonly TableQrIssue[] }
  /** 409: the current configuration forbids it; `code` is the API's error code. */
  | { kind: "conflict"; code: string }
  /** 404: the table no longer exists. */
  | { kind: "not-found" }
  /** 401: no usable session cookie. */
  | { kind: "unauthorized" }
  | { kind: "network" }
  | { kind: "unknown" };

export type TableQrResult<T> = { ok: true; value: T } | { ok: false; error: TableQrApiError };

const API_BASE = "/api/tables";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function toIssues(value: unknown): TableQrIssue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((issue): TableQrIssue[] =>
    isRecord(issue) && typeof issue.path === "string" && typeof issue.code === "string"
      ? [{ path: issue.path, code: issue.code }]
      : [],
  );
}

async function toError(response: Response): Promise<TableQrApiError> {
  if (response.status === 401) return { kind: "unauthorized" };
  if (response.status === 404) return { kind: "not-found" };
  if (response.status !== 400 && response.status !== 409) return { kind: "unknown" };
  const body = await readJson(response);
  if (response.status === 400) return { kind: "invalid", issues: isRecord(body) ? toIssues(body.issues) : [] };
  return isRecord(body) && typeof body.error === "string" ? { kind: "conflict", code: body.error } : { kind: "unknown" };
}

async function request(path: string, init: RequestInit): Promise<TableQrResult<TablesQrConfig>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, credentials: "same-origin" });
  } catch {
    return { ok: false, error: { kind: "network" } };
  }
  if (!response.ok) return { ok: false, error: await toError(response) };
  const value = toTablesQrConfig(await readJson(response));
  return value === null ? { ok: false, error: { kind: "unknown" } } : { ok: true, value };
}

/** `GET /tables/config`: spaces and tables with their QR credentials. */
export function getTablesConfig(): Promise<TableQrResult<TablesQrConfig>> {
  return request("/config", { method: "GET" });
}

/** `POST /tables/:tableId/qr/regenerate`: revokes the active token and issues a new one. */
export function regenerateQr(tableId: string): Promise<TableQrResult<TablesQrConfig>> {
  return request(`/${encodeURIComponent(tableId)}/qr/regenerate`, { method: "POST" });
}
