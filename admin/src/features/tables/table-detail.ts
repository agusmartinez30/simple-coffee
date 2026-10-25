import { REQUEST_MODES, deriveTable, getOpenSession, getSessionOrders, type ServiceDay } from "@/mocks/service-day";
import type { ManagedOrderStatus } from "@/mocks/types";
import { formatPrice } from "@/shared/lib/format-price";
import { formatTableLabel, getStatusBadge, type TableTone } from "./tables-view";

export type DetailTone = TableTone | "neutral";

export type DetailTag = { label: string; tone: DetailTone };

export type DetailLine = { id: string; quantityLabel: string; name: string; price: string };

export type DetailOrder = { id: number; label: string; status: DetailTag; lines: DetailLine[] };

/** "Detalle rápido" (02D) of one table. */
export type TableDetail = {
  number: number;
  label: string;
  badge: DetailTag;
  /** "Total cuenta compartida". */
  total: string;
  /** "5 productos": units across the session's orders. */
  productCount: string;
  orders: DetailOrder[];
  /** "Cuenta abierta", or how a table that asked for the bill wants to pay. */
  account: DetailTag;
  note: string;
  /** "Cobrar mesa" only applies to seated tables. */
  canCharge: boolean;
};

/** Kitchen status chip of each "Pedido #…" ("Confirmado" until the kitchen takes it). */
const ORDER_STATUS: Record<Exclude<ManagedOrderStatus, "cancelled">, DetailTag> = {
  received: { label: "Confirmado", tone: "success" },
  preparing: { label: "En cocina", tone: "danger" },
  delivered: { label: "Entregado", tone: "neutral" },
};

const OPEN_NOTE = "Podés sumar productos al pedido o cobrar y cerrar la mesa.";
const FREE_NOTE = "La mesa está libre: cargá un pedido para abrir la cuenta.";

export function getTableDetail(day: ServiceDay, tableNumber: number): TableDetail {
  const table = deriveTable(day, tableNumber);
  const session = getOpenSession(day, tableNumber);
  const orders = session ? getSessionOrders(day, session.id) : [];
  const units = orders.flatMap((order) => order.items).reduce((sum, item) => sum + item.quantity, 0);
  const mode = REQUEST_MODES.find((item) => item.id === table.paymentPreference);
  const account: DetailTag = !session
    ? { label: "Sin cuenta abierta", tone: "neutral" }
    : mode
      ? { label: `Pago ${mode.label.toLowerCase()}`, tone: "danger" }
      : { label: "Cuenta abierta", tone: "danger" };

  return {
    number: tableNumber,
    label: formatTableLabel(tableNumber),
    badge: getStatusBadge(table),
    total: formatPrice(table.accountTotal),
    productCount: `${units} ${units === 1 ? "producto" : "productos"}`,
    orders: orders.map((order) => ({
      id: order.id,
      label: `Pedido #${order.id}`,
      status: ORDER_STATUS[order.status as Exclude<ManagedOrderStatus, "cancelled">],
      lines: order.items.map((item) => ({
        id: item.id,
        quantityLabel: `${item.quantity}×`,
        name: item.name,
        price: formatPrice(item.quantity * item.unitPrice),
      })),
    })),
    account,
    note: session ? OPEN_NOTE : FREE_NOTE,
    canCharge: Boolean(session),
  };
}
