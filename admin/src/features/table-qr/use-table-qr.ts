"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { sessionStore } from "@/features/auth/session-store";
import { getTablesConfig, regenerateQr, type TableQrApiError } from "./table-qr-api";
import { describeTableQrError, type TableQrOperation } from "./table-qr-errors";
import { createTableQrState, getSelectedTable, tableQrReducer, type TableQrAction, type TableQrState } from "./table-qr-state";

/**
 * Table QR codes on the API: loads `{ spaces, tables }` once (and on retry), and rotates the
 * selected table's token after confirmation, applying the configuration the API answers. A 401
 * signs out, so the auth guard sends the staff member to /login.
 */
export function useTableQr(): {
  state: TableQrState;
  dispatch: (action: TableQrAction) => void;
  retry: () => void;
  confirmRegenerate: () => void;
} {
  const [state, dispatch] = useReducer(tableQrReducer, undefined, createTableQrState);
  const loading = useRef(false);

  const fail = useCallback((error: TableQrApiError, operation: TableQrOperation) => {
    if (error.kind === "unauthorized") {
      sessionStore.signOut();
      if (operation === "regenerate") dispatch({ type: "regenerate-failed", message: null });
      return;
    }
    const message = describeTableQrError(error, operation);
    dispatch(operation === "load" ? { type: "load-failed", message } : { type: "regenerate-failed", message });
  }, []);

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    const result = await getTablesConfig();
    loading.current = false;
    if (result.ok) dispatch({ type: "loaded", config: result.value });
    else fail(result.error, "load");
  }, [fail]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(() => {
    dispatch({ type: "retry" });
    void load();
  }, [load]);

  const selected = getSelectedTable(state);
  const pending = state.pendingId !== null;
  const confirmRegenerate = useCallback(() => {
    if (!selected || pending) return;
    const { id, label } = selected;
    dispatch({ type: "regenerate-started", id });
    void regenerateQr(id).then((result) => {
      if (result.ok) {
        dispatch({
          type: "regenerate-succeeded",
          config: result.value,
          message: `Generamos un nuevo código QR para ${label}. Reemplazá el código impreso.`,
        });
        return;
      }
      fail(result.error, "regenerate");
      if (result.error.kind === "not-found") void load();
    });
  }, [fail, load, pending, selected]);

  return { state, dispatch, retry, confirmRegenerate };
}
