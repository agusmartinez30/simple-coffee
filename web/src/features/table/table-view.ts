import type { TableOrder } from "@/mocks/types";

/** Variants of screen 07: open account plus 07A–D. */
export type TableView = "open" | "requested" | "closed" | "empty" | "error";

/** Variants that `?state=` can force on `/table`. */
export const TABLE_FORCED_STATES = ["requested", "closed", "empty", "error"] as const;
export type TableForcedState = (typeof TABLE_FORCED_STATES)[number];

type TableViewInput = {
  orders: readonly TableOrder[];
};

/** Picks the screen 07 variant from the table session; a forced state always wins. */
export function getTableView(
  { orders }: TableViewInput,
  forced: TableForcedState | null,
): TableView {
  if (forced) return forced;
  const hasBillableOrders = orders.some((order) => order.status !== "cancelled");
  return hasBillableOrders ? "open" : "empty";
}
