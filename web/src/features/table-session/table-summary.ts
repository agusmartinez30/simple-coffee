import { getOrderTotal } from "@/mocks/table";
import type { Ars, TableOrder } from "@/mocks/types";

export type TableSummary = {
  /** Total of the table's orders. */
  total: Ars;
  orderCount: number;
};

/** Figures shown on the table screen, always computed from the order lines. */
export function getTableSummary(orders: readonly TableOrder[]): TableSummary {
  return {
    total: orders.reduce((sum, order) => sum + getOrderTotal(order), 0),
    orderCount: orders.length,
  };
}

export function formatOrderCount(count: number): string {
  return `${count} ${count === 1 ? "pedido" : "pedidos"}`;
}
