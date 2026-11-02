"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type { Ars, TableOrder } from "@/mocks/types";
import type { PaymentMethod } from "./payment-method";
import {
  buildOrder,
  initialSession,
  parseStoredSession,
  selectTableTotal,
  tableSessionReducer,
  type BillRequest,
  type BuildOrderResult,
  type PlaceOrderInput,
} from "./table-session-reducer";

// Bump the version when the seed data or the session shape changes, so stale sessions saved in browsers are dropped.
const STORAGE_KEY = "cafe-central:table-session:v6";

export type TableSessionContextValue = {
  orders: TableOrder[];
  tableTotal: Ars;
  /** False until the persisted session has been restored after mount. */
  hydrated: boolean;
  getOrder: (orderId: string) => TableOrder | undefined;
  /** Validates and adds the order; the result carries the created order or the reason. */
  placeOrder: (input: PlaceOrderInput) => BuildOrderResult;
  billRequest: BillRequest | null;
  /** Requests the bill with the method, or changes the method of the current request. */
  requestBill: (method: PaymentMethod, time: string) => void;
  reset: () => void;
};

const TableSessionContext = createContext<TableSessionContextValue | null>(null);

function readStoredSession() {
  try {
    return parseStoredSession(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return initialSession;
  }
}

function writeStoredSession(value: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore quota or availability errors: the session still works in memory.
  }
}

/**
 * Orders and the bill request shared by the order and table screens. It starts from the
 * seed on the server and the first client render (hydration-safe), then restores the
 * persisted session after mount.
 */
export function TableSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tableSessionReducer, initialSession);
  const restored = useRef(false);
  const stateRef = useRef(state);
  const [hydrated, markHydrated] = useReducer(() => true, false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const stored = readStoredSession();
    stateRef.current = stored;
    dispatch({ type: "hydrate", state: stored });
    markHydrated();
  }, []);

  useEffect(() => {
    // Skip the initial seed so it never overwrites the stored session before restore.
    if (!restored.current) {
      restored.current = true;
      return;
    }
    writeStoredSession(JSON.stringify(state));
  }, [state]);

  const value = useMemo<TableSessionContextValue>(
    () => ({
      orders: state.orders,
      tableTotal: selectTableTotal(state),
      hydrated,
      getOrder: (orderId) => state.orders.find((order) => order.id === orderId),
      placeOrder: (input) => {
        // Read the latest state so two quick submissions never reuse an order number.
        const result = buildOrder(stateRef.current, input);
        if (result.ok) {
          stateRef.current = tableSessionReducer(stateRef.current, {
            type: "addOrder",
            order: result.order,
          });
          dispatch({ type: "addOrder", order: result.order });
        }
        return result;
      },
      billRequest: state.billRequest,
      requestBill: (method, time) => dispatch({ type: "requestBill", method, time }),
      reset: () => dispatch({ type: "reset" }),
    }),
    [state, hydrated],
  );

  return <TableSessionContext.Provider value={value}>{children}</TableSessionContext.Provider>;
}

export function useTableSession(): TableSessionContextValue {
  const context = useContext(TableSessionContext);
  if (!context) throw new Error("useTableSession must be used within <TableSessionProvider>");
  return context;
}
