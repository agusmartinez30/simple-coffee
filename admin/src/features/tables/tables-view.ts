import { getRequestModeShortLabel } from "@/mocks/service-day/catalog";
import type { ManagedTable } from "@/mocks/types";
import { formatPrice } from "@/shared/lib/format-price";

/**
 * What a table is doing right now. Occupied tables with kitchen orders count as "preparing";
 * a bill request wins over the kitchen, so the four 02 summary metrics add up to every table.
 */
export type TableActivity = "available" | "occupied" | "preparing" | "bill-requested";

export type TableFilter = "all" | TableActivity;

export type TableTone = "success" | "brand" | "warning" | "danger";

export function getTableActivity(table: ManagedTable): TableActivity {
  if (table.status === "bill-requested") return "bill-requested";
  if (table.status === "available") return "available";
  return table.pendingKitchenOrders > 0 ? "preparing" : "occupied";
}

const ACTIVITY_ORDER: readonly TableActivity[] = ["available", "occupied", "preparing", "bill-requested"];

const METRIC_COPY: Record<TableActivity, { label: string; tone: TableTone }> = {
  available: { label: "Disponibles", tone: "success" },
  occupied: { label: "Ocupadas", tone: "brand" },
  preparing: { label: "En preparación", tone: "warning" },
  "bill-requested": { label: "Solicitan cuenta", tone: "danger" },
};

export type SummaryMetric = {
  id: TableActivity;
  label: string;
  value: number;
  tone: TableTone;
};

/** "Summary Metrics" row: one count per activity, so the four values add up to all tables. */
export function getSummaryMetrics(tables: readonly ManagedTable[]): SummaryMetric[] {
  const counts = countTablesByFilter(tables);
  return ACTIVITY_ORDER.map((id) => ({ id, value: counts[id], ...METRIC_COPY[id] }));
}

/** "Status Chips" of the search bar, in the order of the design. */
export const TABLE_FILTERS: readonly { id: TableFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "available", label: "Disponibles" },
  { id: "occupied", label: "Ocupadas" },
  { id: "preparing", label: "Preparación" },
  { id: "bill-requested", label: "Cuenta solicitada" },
];

export function countTablesByFilter(tables: readonly ManagedTable[]): Record<TableFilter, number> {
  const counts: Record<TableFilter, number> = {
    all: tables.length,
    available: 0,
    occupied: 0,
    preparing: 0,
    "bill-requested": 0,
  };
  for (const table of tables) counts[getTableActivity(table)] += 1;
  return counts;
}

/** "Mesa 05". */
export function formatTableLabel(number: number): string {
  return `Mesa ${String(number).padStart(2, "0")}`;
}

function matchesQuery(table: ManagedTable, query: string): boolean {
  if (query === "") return true;
  if (formatTableLabel(table.number).toLowerCase().includes(query)) return true;
  // "mesa 5" or "5" should find Mesa 05 even without the leading zero.
  const digits = query.replace(/^mesa\s*/, "");
  return /^\d+$/.test(digits) && Number(digits) === table.number;
}

export type TableQuery = {
  filter: TableFilter;
  query: string;
};

/** Applies the active status chip and the "Buscar mesa..." text. */
export function filterTables(tables: readonly ManagedTable[], { filter, query }: TableQuery): ManagedTable[] {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  return tables.filter(
    (table) => (filter === "all" || getTableActivity(table) === filter) && matchesQuery(table, normalized),
  );
}

/** "Order Count" line of a card. */
export function formatOrderCount(table: ManagedTable): string {
  if (table.status === "available") return "Lista para asignar";
  return table.confirmedOrders === 1 ? "1 pedido" : `${table.confirmedOrders} pedidos`;
}

/** "Account Total" of a card; available tables have no account yet. */
export function formatAccountTotal(table: ManagedTable): string {
  return table.status === "available" ? "—" : formatPrice(table.accountTotal);
}

const STATUS_BADGES: Record<ManagedTable["status"], { label: string; tone: TableTone }> = {
  available: { label: "Disponible", tone: "success" },
  occupied: { label: "Ocupada", tone: "brand" },
  "bill-requested": { label: "Cuenta solicitada", tone: "danger" },
};

export function getStatusBadge(table: ManagedTable): { label: string; tone: TableTone } {
  return STATUS_BADGES[table.status];
}

/** "Card Alert" about kitchen orders; bill requests show the payment preference instead. */
export function getCardAlert(table: ManagedTable): string | null {
  if (getTableActivity(table) !== "preparing") return null;
  return table.pendingKitchenOrders === 1
    ? "En preparación"
    : `${table.pendingKitchenOrders} en preparación`;
}

/** Short request-mode chip shared with 04, 05 and 10A ("Transferencia" for 06's "Por transferencia"). */
export function getPaymentPreferenceLabel(table: ManagedTable): string | null {
  if (table.status !== "bill-requested" || !table.paymentPreference) return null;
  return getRequestModeShortLabel(table.paymentPreference);
}

/** "Realtime Status" pill of the page header. */
export function formatRealtimeLabel(syncedAt: string): string {
  return `En vivo · ${syncedAt}`;
}
