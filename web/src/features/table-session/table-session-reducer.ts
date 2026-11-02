import { getProductById } from "@/mocks/menu";
import { SEED_ORDERS, buildOrderLine, getTableTotal } from "@/mocks/table";
import type { Ars, TableOrder } from "@/mocks/types";
import { isPaymentMethod, type PaymentMethod } from "./payment-method";

export type BillRequest = {
  method: PaymentMethod;
  /** Local time the bill was requested, e.g. "13:10". */
  time: string;
};

export type TableSessionState = {
  orders: TableOrder[];
  /** Null until the guest asks for the bill; new orders keep it. */
  billRequest: BillRequest | null;
};

export type TableSessionAction =
  | { type: "addOrder"; order: TableOrder }
  /** Requests the bill, or changes the method of an existing request. */
  | { type: "requestBill"; method: PaymentMethod; time: string }
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
  billRequest: null,
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
    case "requestBill":
      return { ...state, billRequest: { method: action.method, time: action.time } };
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

function parseBillRequest(value: unknown): BillRequest | null {
  if (typeof value !== "object" || value === null) return null;
  const request = value as Record<string, unknown>;
  if (!isPaymentMethod(request.method) || typeof request.time !== "string") return null;
  return { method: request.method, time: request.time };
}

/** Parses the persisted session, falling back to the initial session on any malformed data. */
export function parseStoredSession(raw: string | null): TableSessionState {
  if (!raw) return initialSession;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<keyof TableSessionState, unknown>>;
    const orders = parsed?.orders;
    if (!Array.isArray(orders) || !orders.every(isOrder)) return initialSession;
    // A malformed bill request is dropped on its own; the orders are still valid.
    return { orders, billRequest: parseBillRequest(parsed.billRequest) };
  } catch {
    return initialSession;
  }
}
