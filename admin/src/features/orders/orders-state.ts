import type { Order } from "./order-types";
import { canCancelOrder } from "./orders-view";

/**
 * State of 03 backed by the `/orders` API: the day's orders, the order shown in the detail panel,
 * the pending cancellation and the orders with a request in flight. Status changes are not
 * optimistic: the board applies the order the API answers.
 */
export type OrdersState = {
  /** `loading` until the first list arrives; `failed` when that first load did not. */
  load: "loading" | "ready" | "failed";
  orders: Order[];
  selectedId: string | null;
  cancelTargetId: string | null;
  /** Orders with an advance or cancel in flight; their actions stay disabled. */
  pendingIds: string[];
  /** Error of the last failed action or refresh, shown above the board. */
  notice: string | null;
};

export type OrdersAction =
  /** A list from the API; `defaultSelectedId` opens the panel on the first load only. */
  | { type: "loaded"; orders: Order[]; defaultSelectedId: string | null }
  | { type: "load-failed"; message: string }
  | { type: "action-started"; id: string }
  | { type: "action-succeeded"; order: Order }
  /** `message` is null when there is nothing to tell (a lost session redirects to /login). */
  | { type: "action-failed"; id: string; message: string | null }
  | { type: "dismiss-notice" }
  | { type: "open-detail"; id: string }
  | { type: "close-detail" }
  | { type: "request-cancel"; id: string }
  | { type: "dismiss-cancel" };

export function createOrdersState(
  orders: Order[] | null = null,
  { selectedId = null, cancelTargetId = null }: Partial<Pick<OrdersState, "selectedId" | "cancelTargetId">> = {},
): OrdersState {
  return {
    load: orders === null ? "loading" : "ready",
    orders: orders ?? [],
    selectedId,
    cancelTargetId,
    pendingIds: [],
    notice: null,
  };
}

function findOrder(state: OrdersState, id: string | null): Order | null {
  return id === null ? null : (state.orders.find((order) => order.id === id) ?? null);
}

export function getSelectedOrder(state: OrdersState): Order | null {
  return findOrder(state, state.selectedId);
}

export function getCancelTarget(state: OrdersState): Order | null {
  return findOrder(state, state.cancelTargetId);
}

export function isOrderPending(state: OrdersState, id: string): boolean {
  return state.pendingIds.includes(id);
}

/** The newer of two copies of an order; a poll that started before an action must not undo it. */
const newer = (current: Order, incoming: Order) => (incoming.updatedAt < current.updatedAt ? current : incoming);

function mergeList(current: readonly Order[], incoming: readonly Order[]): Order[] {
  const byId = new Map(current.map((order) => [order.id, order]));
  return incoming.map((order) => {
    const known = byId.get(order.id);
    return known ? newer(known, order) : order;
  });
}

function upsert(current: readonly Order[], order: Order): Order[] {
  const index = current.findIndex((candidate) => candidate.id === order.id);
  if (index === -1) return [...current, order];
  return current.map((candidate, at) => (at === index ? newer(candidate, order) : candidate));
}

const withoutPending = (state: OrdersState, id: string) => state.pendingIds.filter((pending) => pending !== id);

/** Keeps the panel and the dialog on orders that are still on the board. */
function settleSelection(state: OrdersState): OrdersState {
  const selected = getSelectedOrder(state);
  const target = getCancelTarget(state);
  return {
    ...state,
    selectedId: selected && selected.status !== "cancelled" ? state.selectedId : null,
    cancelTargetId: target && canCancelOrder(target) ? state.cancelTargetId : null,
  };
}

/**
 * Pure transitions of the orders screen. Cancelling is two-step: `request-cancel` opens the
 * confirmation dialog, and the order only changes once the API answers it (`action-succeeded`).
 */
export function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
  switch (action.type) {
    case "loaded": {
      const first = state.load !== "ready";
      return settleSelection({
        ...state,
        load: "ready",
        orders: mergeList(state.orders, action.orders),
        selectedId: first ? action.defaultSelectedId : state.selectedId,
      });
    }
    case "load-failed":
      // Once the board is up, a failed refresh keeps it and only warns.
      return state.load === "ready" ? { ...state, notice: action.message } : { ...state, load: "failed" };
    case "action-started":
      return isOrderPending(state, action.id) ? state : { ...state, pendingIds: [...state.pendingIds, action.id] };
    case "action-succeeded":
      return settleSelection({
        ...state,
        orders: upsert(state.orders, action.order),
        pendingIds: withoutPending(state, action.order.id),
      });
    case "action-failed":
      return {
        ...state,
        pendingIds: withoutPending(state, action.id),
        cancelTargetId: state.cancelTargetId === action.id ? null : state.cancelTargetId,
        notice: action.message ?? state.notice,
      };
    case "dismiss-notice":
      return { ...state, notice: null };
    case "open-detail":
      return findOrder(state, action.id) ? { ...state, selectedId: action.id } : state;
    case "close-detail":
      return { ...state, selectedId: null };
    case "request-cancel": {
      const order = findOrder(state, action.id);
      return order && canCancelOrder(order) ? { ...state, cancelTargetId: action.id } : state;
    }
    case "dismiss-cancel":
      return { ...state, cancelTargetId: null };
  }
}
