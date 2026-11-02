import type { AccessTable, TableQrResult } from "./table-access-api";
import { formatTableNumber } from "./table-number";
import { sameTableCredentials, type TableCredentials } from "./table-qr-params";

/**
 * - `idle`: nothing read yet (server render and first client render).
 * - `checking`: the credentials are being validated against the API.
 * - `valid`: the QR belongs to an enabled table with an active token.
 * - `invalid`: no QR was scanned (`missing`) or the API rejected it (`rejected`).
 * - `offline`: the API could not answer; the credentials are kept for a retry.
 */
export type TableAccessState =
  | { status: "idle" }
  | { status: "checking"; credentials: TableCredentials }
  | { status: "valid"; table: AccessTable; credentials: TableCredentials }
  | { status: "invalid"; reason: "missing" | "rejected" }
  | { status: "offline"; credentials: TableCredentials };

export type TableAccessAction =
  | { type: "check"; credentials: TableCredentials }
  | { type: "missing" }
  | { type: "resolved"; credentials: TableCredentials; result: TableQrResult };

export const initialTableAccess: TableAccessState = { status: "idle" };

export function tableAccessReducer(
  state: TableAccessState,
  action: TableAccessAction,
): TableAccessState {
  switch (action.type) {
    case "check":
      return { status: "checking", credentials: action.credentials };
    case "missing":
      return { status: "invalid", reason: "missing" };
    case "resolved": {
      // A late answer for credentials that are no longer being checked must not win.
      if (state.status !== "checking" || !sameTableCredentials(state.credentials, action.credentials)) {
        return state;
      }
      const { result, credentials } = action;
      if (result.ok) return { status: "valid", table: result.table, credentials };
      if (result.error === "invalid") return { status: "invalid", reason: "rejected" };
      return { status: "offline", credentials };
    }
  }
}

/** The table number to show ("07"), only once the QR has been validated. */
export function selectTableNumber(state: TableAccessState): string | null {
  return state.status === "valid" ? formatTableNumber(state.table.number) : null;
}
