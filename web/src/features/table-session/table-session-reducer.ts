import { getProductById } from "@/mocks/menu";
import { SEED_ORDERS, buildOrderLine, getTableTotal } from "@/mocks/table";
import type { Ars, TableOrder } from "@/mocks/types";

export type TableSessionState = {
  orders: TableOrder[];
};

export type TableSessionAction =
  | { type: "addOrder"; order: TableOrder }
  | { type: "reset" }
  | { type: "hydrate"; state: TableSessionState };

/** A cart line as the order needs it; structurally compatible with `CartLine`. */
export type OrderInputLine = {
  productId: string;
  choiceIds: readonly string[];
  quantity: number;
  note?: string;
};

export type PlaceOrderInput = {
  customerName: string;
  note?: string;
  /** Local time shown on the order, e.g. "12:30". */
  time: string;
  lines: readonly OrderInputLine[];
};

export type BuildOrderResult =
  | { ok: true; order: TableOrder }
  | { ok: false; reason: "missing-name" | "empty" };

const FIRST_ORDER_NUMBER = 1001;

export const initialSession: TableSessionState = {
  orders: SEED_ORDERS,
};

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

export function getNextOrderNumber(orders: readonly TableOrder[]): string {
  const highest = orders.reduce((max, order) => Math.max(max, Number(order.number) || 0), 0);
  return String(highest > 0 ? highest + 1 : FIRST_ORDER_NUMBER);
}

/** Validates the checkout input and turns cart lines into an order priced from the menu. */
export function buildOrder(state: TableSessionState, input: PlaceOrderInput): BuildOrderResult {
  const customerName = trimmed(input.customerName);
  if (!customerName) return { ok: false, reason: "missing-name" };

  const lines = input.lines
    .filter((line) => line.quantity > 0 && getProductById(line.productId))
    .map((line) =>
      buildOrderLine({
        productId: line.productId,
        quantity: line.quantity,
        choiceIds: [...line.choiceIds],
        note: trimmed(line.note),
      }),
    );
  if (lines.length === 0) return { ok: false, reason: "empty" };

  const number = getNextOrderNumber(state.orders);
  return {
    ok: true,
    order: {
      id: `order-${number}`,
      number,
      customerName,
      time: input.time,
      lines,
      note: trimmed(input.note),
    },
  };
}

export function tableSessionReducer(
  state: TableSessionState,
  action: TableSessionAction,
): TableSessionState {
  switch (action.type) {
    case "addOrder":
      if (state.orders.some((order) => order.id === action.order.id)) return state;
      return { ...state, orders: [...state.orders, action.order] };
    case "reset":
      return initialSession;
    case "hydrate":
      return action.state;
  }
}

export function selectOrderById(state: TableSessionState, orderId: string): TableOrder | undefined {
  return state.orders.find((order) => order.id === orderId);
}

/** Shared account total, always computed from the order lines. */
export function selectTableTotal(state: TableSessionState): Ars {
  return getTableTotal(state.orders);
}

function isOrder(value: unknown): value is TableOrder {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.id === "string" &&
    typeof order.number === "string" &&
    typeof order.customerName === "string" &&
    typeof order.time === "string" &&
    (order.note === undefined || typeof order.note === "string") &&
    Array.isArray(order.lines) &&
    order.lines.every((line: unknown) => {
      const l = line as Record<string, unknown> | null;
      return (
        typeof l === "object" &&
        l !== null &&
        typeof l.productId === "string" &&
        typeof l.name === "string" &&
        typeof l.quantity === "number" &&
        typeof l.unitPrice === "number"
      );
    })
  );
}

/** Parses the persisted session, falling back to the initial session on any malformed data. */
export function parseStoredSession(raw: string | null): TableSessionState {
  if (!raw) return initialSession;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof TableSessionState, unknown>>;
    const orders = parsed?.orders;
    if (!Array.isArray(orders) || !orders.every(isOrder)) return initialSession;
    return { orders };
  } catch {
    return initialSession;
  }
}
