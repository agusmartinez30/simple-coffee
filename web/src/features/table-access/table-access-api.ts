/**
 * Client for the public table QR endpoint. Calls go to `/api/*`, which `next.config.ts`
 * rewrites to `API_URL`.
 */

/** Public projection of a table returned by `GET /tables/qr`. */
export type AccessTable = { number: number; label: string; spaceName: string };

/**
 * `invalid`: the API rejected the QR (unknown or disabled table, inactive token, malformed
 * query). `network`: the API could not answer (offline, server error, unexpected body).
 */
export type TableQrError = "invalid" | "network";

export type TableQrResult = { ok: true; table: AccessTable } | { ok: false; error: TableQrError };

const ENDPOINT = "/api/tables/qr";

function isAccessTable(value: unknown): value is AccessTable {
  if (typeof value !== "object" || value === null) return false;
  const { number, label, spaceName } = value as Record<string, unknown>;
  return typeof number === "number" && typeof label === "string" && typeof spaceName === "string";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** `GET /tables/qr?number=&token=`: the table the QR belongs to, when the QR is still valid. */
export async function resolveTableQr(number: string, token: string): Promise<TableQrResult> {
  const query = new URLSearchParams({ number, token });
  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${query}`, { cache: "no-store" });
  } catch {
    return { ok: false, error: "network" };
  }
  if (response.status === 400 || response.status === 404) return { ok: false, error: "invalid" };
  if (!response.ok) return { ok: false, error: "network" };
  const body = await readJson(response);
  return isAccessTable(body) ? { ok: true, table: body } : { ok: false, error: "network" };
}
