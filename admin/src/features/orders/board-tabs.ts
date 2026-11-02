import type { OrderColumn, OrderColumnId, OrderTone } from "./orders-view";

/** One status tab of the mobile board ("Recibidos 3"). */
export type ColumnTab = {
  id: OrderColumnId;
  label: string;
  count: number;
  tone: OrderTone;
};

/** Tabs of the mobile board: one per visible column, so a hidden delivered column has no tab. */
export function getColumnTabs(columns: readonly OrderColumn[]): ColumnTab[] {
  return columns.map((column) => ({
    id: column.id,
    label: column.title,
    count: column.orders.length,
    tone: column.tone,
  }));
}

/**
 * Column shown on the mobile board: the one the staff member chose while it stays visible, else
 * the first column with orders, else the first column (null without columns).
 */
export function pickActiveTab(columns: readonly OrderColumn[], chosen: OrderColumnId | null): OrderColumnId | null {
  if (chosen !== null && columns.some((column) => column.id === chosen)) return chosen;
  return (columns.find((column) => column.orders.length > 0) ?? columns[0])?.id ?? null;
}
