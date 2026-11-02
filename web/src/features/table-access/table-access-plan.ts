import type { TableQrResult } from "./table-access-api";
import { sameTableCredentials, toTableCredentials, type TableCredentials } from "./table-qr-params";

/** Credentials to validate on load, and where they came from. */
export type AccessCheck = {
  kind: "check";
  credentials: TableCredentials;
  /** The credentials came from the QR URL, which is cleaned once the answer is definitive. */
  fromUrl: boolean;
  /** A different table or token than the stored one: the table session belongs to another QR. */
  tableChanged: boolean;
};

export type AccessPlan = AccessCheck | { kind: "missing" };

/** A freshly scanned QR wins over the stored credentials; without either there is no table. */
export function planAccess(
  fromUrl: TableCredentials | null,
  stored: TableCredentials | null,
): AccessPlan {
  if (fromUrl) {
    return {
      kind: "check",
      credentials: fromUrl,
      fromUrl: true,
      tableChanged: stored !== null && !sameTableCredentials(fromUrl, stored),
    };
  }
  if (stored) return { kind: "check", credentials: stored, fromUrl: false, tableChanged: false };
  return { kind: "missing" };
}

/** Side effects to apply once the API answered a check. */
export type AccessOutcome = {
  storage: "save" | "clear" | "keep";
  stripUrl: boolean;
  resetSession: boolean;
};

/**
 * A valid QR is persisted (and resets the session when it is another table); a rejected one is
 * forgotten. A network error changes nothing, so the URL or the storage retries on reload.
 */
export function planOutcome(check: AccessCheck, result: TableQrResult): AccessOutcome {
  if (result.ok) {
    return { storage: "save", stripUrl: check.fromUrl, resetSession: check.tableChanged };
  }
  if (result.error === "invalid") {
    return { storage: "clear", stripUrl: check.fromUrl, resetSession: false };
  }
  return { storage: "keep", stripUrl: false, resetSession: false };
}

/** Credentials saved by a previous visit, or null when absent or not trustworthy. */
export function parseStoredCredentials(raw: string | null): TableCredentials | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const { number, token } = value as Record<string, unknown>;
    return toTableCredentials(number, token);
  } catch {
    return null;
  }
}
