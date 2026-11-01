import type { TableOrder } from "@/mocks/types";

/** Variants of screen 07: the order summary, its empty state and the connection error. */
export type TableView = "open" | "empty" | "error";

/** Variants that `?state=` can force on `/table`. */
export const TABLE_FORCED_STATES = ["empty", "error"] as const;
export type TableForcedState = (typeof TABLE_FORCED_STATES)[number];

type TableViewInput = {
  orders: readonly TableOrder[];
};

/** Picks the screen 07 variant from the table orders; a forced state always wins. */
export function getTableView({ orders }: TableViewInput, forced: TableForcedState | null): TableView {
  if (forced) return forced;
  const hasActiveOrders = orders.some((order) => order.status !== "cancelled");
  return hasActiveOrders ? "open" : "empty";
}
