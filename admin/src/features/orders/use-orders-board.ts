"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { sessionStore } from "@/features/auth/session-store";
import type { CancellationReason, Order } from "./order-types";
import { getDefaultSelectedOrderId } from "./order-alerts";
import { advanceOrder, cancelOrder, listOrders, type OrdersApiError, type OrdersResult } from "./orders-api";
import { describeOrdersError, type OrdersOperation } from "./orders-errors";
import { createOrdersState, ordersReducer, type OrdersAction, type OrdersState } from "./orders-state";
import { formatServiceTime } from "./service-clock";

/** "En vivo": the board refreshes the day's orders (and its clock) this often while the tab is visible. */
export const ORDERS_POLL_MS = 10_000;

const currentTime = () => formatServiceTime(new Date());

/** Errors after which the board's copy of the order is stale, so it refreshes right away. */
const isStale = (error: OrdersApiError) => error.kind === "not-found" || error.kind === "conflict";

/**
 * Orders board on the API: loads today's orders, polls them every `ORDERS_POLL_MS` (paused while
 * the tab is hidden), keeps `now` ("HH:MM" in the service time zone) in step, and sends advance /
 * cancel, applying the order the API answers. `offline` (the forced `empty` variant) starts with an
 * empty board and never calls the API.
 */
export function useOrdersBoard({ offline = false }: { offline?: boolean } = {}): {
  state: OrdersState;
  now: string;
  dispatch: (action: OrdersAction) => void;
  refresh: () => Promise<void>;
  advance: (id: string) => void;
  confirmCancel: (reason: CancellationReason) => void;
} {
  const [state, dispatch] = useReducer(ordersReducer, offline ? [] : null, createOrdersState);
  const [now, setNow] = useState(currentTime);
  const loading = useRef(false);

  const fail = useCallback((error: OrdersApiError, operation: OrdersOperation, id?: string) => {
    // A missing session is handled by the auth guard, which sends the staff member to /login.
    if (error.kind === "unauthorized") sessionStore.signOut();
    const message = error.kind === "unauthorized" ? null : describeOrdersError(error, operation);
    if (id !== undefined) dispatch({ type: "action-failed", id, message });
    else if (message !== null) dispatch({ type: "load-failed", message });
  }, []);

  const refresh = useCallback(async () => {
    if (offline || loading.current) return;
    loading.current = true;
    const result = await listOrders();
    loading.current = false;
    const time = currentTime();
    setNow(time);
    if (result.ok) {
      dispatch({ type: "loaded", orders: result.value, defaultSelectedId: getDefaultSelectedOrderId(result.value, time) });
    } else {
      fail(result.error, "load");
    }
  }, [fail, offline]);

  useEffect(() => {
    void refresh();
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = window.setInterval(tick, ORDERS_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  const run = useCallback(
    async (id: string, operation: OrdersOperation, call: () => Promise<OrdersResult<Order>>) => {
      dispatch({ type: "action-started", id });
      const result = await call();
      setNow(currentTime());
      if (result.ok) {
        dispatch({ type: "action-succeeded", order: result.value });
        return;
      }
      fail(result.error, operation, id);
      if (isStale(result.error)) void refresh();
    },
    [fail, refresh],
  );

  const advance = useCallback((id: string) => void run(id, "advance", () => advanceOrder(id)), [run]);

  const cancelTargetId = state.cancelTargetId;
  const confirmCancel = useCallback(
    (reason: CancellationReason) => {
      if (cancelTargetId !== null) void run(cancelTargetId, "cancel", () => cancelOrder(cancelTargetId, reason));
    },
    [cancelTargetId, run],
  );

  return { state, now, dispatch, refresh, advance, confirmCancel };
}
