import { ORDERS_BOARD } from "@/mocks/service-day";
import type { ManagedOrder } from "@/mocks/types";
import type { Order } from "./order-types";

/** Test-only fixtures: the board model built from the service-day mock and a small order builder. */

const FIXTURE_UPDATED_AT = "2026-11-02T15:00:00.000Z";

/** A mock order as the board sees it: the mock's number becomes the visible number. */
export const fromMockOrder = (managed: ManagedOrder): Order => ({
  ...managed,
  id: `order-${managed.id}`,
  number: managed.id,
  updatedAt: FIXTURE_UPDATED_AT,
});

/** The five orders of the service-day mock (#1047…#1052), oldest first. */
export const MOCK_BOARD: Order[] = ORDERS_BOARD.orders.map(fromMockOrder);

export const byNumber = (orders: readonly Order[], number: number): Order => {
  const match = orders.find((order) => order.number === number);
  if (!match) throw new Error(`No order #${number}`);
  return match;
};

export const numbers = (orders: readonly Order[]) => orders.map((order) => order.number);

export const buildOrder = (overrides: Partial<Order> & Pick<Order, "number">): Order => ({
  id: `order-${overrides.number}`,
  tableNumber: 1,
  customer: "Ana",
  receivedAt: "12:00",
  items: [{ id: "item-1", quantity: 1, name: "Café", unitPrice: 3000 }],
  status: "received",
  history: [
    { kind: "confirmed", at: "12:00" },
    { kind: "received", at: "12:00" },
  ],
  updatedAt: FIXTURE_UPDATED_AT,
  ...overrides,
});
