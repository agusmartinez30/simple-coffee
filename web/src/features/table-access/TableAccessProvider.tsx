"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { useTableSession } from "@/features/table-session";
import { resolveTableQr } from "./table-access-api";
import { parseStoredCredentials, planAccess, planOutcome, type AccessCheck } from "./table-access-plan";
import {
  initialTableAccess,
  selectTableNumber,
  tableAccessReducer,
  type TableAccessState,
} from "./table-access-state";
import { parseTableQrParams, stripTableQrParams, type TableCredentials } from "./table-qr-params";

// Bump the version when the stored shape changes, so stale credentials saved in browsers are dropped.
const STORAGE_KEY = "cafe-central:table-access:v1";

export type TableAccessContextValue = {
  state: TableAccessState;
  /** The validated table number ("07"), or null while there is no valid QR. */
  tableNumber: string | null;
  /** Validates the last credentials again (after an offline answer). */
  retry: () => void;
};

const TableAccessContext = createContext<TableAccessContextValue | null>(null);

function readStoredCredentials(): TableCredentials | null {
  try {
    return parseStoredCredentials(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return null;
  }
}

function writeStoredCredentials(credentials: TableCredentials | null) {
  try {
    if (credentials) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore quota or availability errors: the access still works in memory.
  }
}

/** Removes `?mesa=&qr=` from the address bar, keeping the path, other params and the hash. */
function stripQrFromUrl() {
  const { pathname, search, hash } = window.location;
  const nextSearch = stripTableQrParams(search);
  if (nextSearch === search) return;
  window.history.replaceState(window.history.state, "", `${pathname}${nextSearch}${hash}`);
}

/**
 * Identifies the customer's table from the QR URL (`/?mesa=07&qr=<token>`) or from the
 * credentials stored by a previous scan, and validates them against the API on every load.
 * It reads `window.location` after mount, so the server and first client render are `idle`.
 * Must be rendered inside `<TableSessionProvider>`: scanning another table resets the session.
 */
export function TableAccessProvider({ children }: { children: ReactNode }) {
  const { reset } = useTableSession();
  const [state, dispatch] = useReducer(tableAccessReducer, initialTableAccess);
  const resetRef = useRef(reset);
  const checkRef = useRef<AccessCheck | null>(null);
  const runRef = useRef(0);

  useEffect(() => {
    resetRef.current = reset;
  }, [reset]);

  const run = useCallback((check: AccessCheck) => {
    const runId = ++runRef.current;
    checkRef.current = check;
    dispatch({ type: "check", credentials: check.credentials });
    void resolveTableQr(check.credentials.number, check.credentials.token).then((result) => {
      // A newer check (or the Strict Mode re-mount) superseded this one.
      if (runId !== runRef.current) return;
      const outcome = planOutcome(check, result);
      if (outcome.storage !== "keep") {
        writeStoredCredentials(outcome.storage === "save" ? check.credentials : null);
      }
      if (outcome.stripUrl) stripQrFromUrl();
      if (outcome.resetSession) resetRef.current();
      dispatch({ type: "resolved", credentials: check.credentials, result });
    });
  }, []);

  useEffect(() => {
    const plan = planAccess(parseTableQrParams(window.location.search), readStoredCredentials());
    if (plan.kind === "missing") dispatch({ type: "missing" });
    else run(plan);
  }, [run]);

  const retry = useCallback(() => {
    if (checkRef.current) run(checkRef.current);
  }, [run]);

  const value = useMemo<TableAccessContextValue>(
    () => ({ state, tableNumber: selectTableNumber(state), retry }),
    [state, retry],
  );

  return <TableAccessContext.Provider value={value}>{children}</TableAccessContext.Provider>;
}

export function useTableAccess(): TableAccessContextValue {
  const context = useContext(TableAccessContext);
  if (!context) throw new Error("useTableAccess must be used within <TableAccessProvider>");
  return context;
}
