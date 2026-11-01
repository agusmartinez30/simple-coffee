import { getOrderTotal } from "@/mocks/table";
import type { Ars, TableOrder } from "@/mocks/types";

export type TableSummary = {
  /** Total of the table's active orders. */
  total: Ars;
  /** Orders that count towards the total. */
  orderCount: number;
};

/**
 * Figures shown on the table screen, always computed from the order lines;
 * cancelled orders are left out of every figure.
 */
export function getTableSummary(orders: readonly TableOrder[]): TableSummary {
  return orders
    .filter((order) => order.status !== "cancelled")
    .reduce<TableSummary>(
      (summary, order) => ({
        total: summary.total + getOrderTotal(order),
        orderCount: summary.orderCount + 1,
      }),
      { total: 0, orderCount: 0 },
    );
}

export function formatOrderCount(count: number): string {
  return `${count} ${count === 1 ? "pedido" : "pedidos"}`;
}
