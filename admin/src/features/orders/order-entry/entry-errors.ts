import type { OrdersApiError, OrdersIssue } from "../orders-api";
import { formatTableLabel } from "../orders-view";
import type { CartLine } from "./cart";
import type { EntryLoadError } from "./entry-api";

/** Spanish notice copy of "Nuevo pedido". A lost session never shows: the guard sends to /login. */

const RETRY = "Intentá de nuevo.";
const CHECK_CONNECTION = "Revisá tu conexión e intentá de nuevo.";

/** Product name of the line an issue path (`lines.N…`) points at. */
function lineName(path: string, lines: readonly CartLine[]): string | null {
  const match = /^lines\.(\d+)/.exec(path);
  return match ? (lines[Number(match[1])]?.name ?? null) : null;
}

function describeIssue(issue: OrdersIssue, lines: readonly CartLine[]): string {
  const name = lineName(issue.path, lines);
  switch (issue.code) {
    case "unknown_table":
      return "Esa mesa ya no existe. Elegí otra.";
    case "required":
      return "Agregá al menos un producto.";
    case "too_many":
      return "El pedido admite hasta 50 líneas.";
    case "out_of_range":
      return "Las cantidades van de 1 a 99.";
    case "unknown_product":
      return name ? `${name} ya no está en la carta. Quitalo del pedido.` : "Un producto ya no está en la carta. Revisá el pedido.";
    case "unknown_option":
    case "duplicate_option":
    case "missing_required_group":
    case "too_many_options":
      return name ? `Revisá las opciones de ${name}.` : "Revisá las opciones del pedido.";
    case "not_allowed":
      return name ? `${name} no admite notas. Borrá la nota de esa línea.` : "Un producto no admite notas.";
    case "too_long":
      if (issue.path === "note") return "La nota para cocina admite hasta 140 caracteres.";
      if (issue.path === "customerName") return "El nombre admite hasta 40 caracteres.";
      return name ? `La nota de ${name} admite hasta 140 caracteres.` : "Una nota supera los 140 caracteres.";
    default:
      return `Revisá el pedido e ${RETRY.toLowerCase()}`;
  }
}

/** Why `POST /orders` failed, in terms of the cart the staff member is looking at. */
export function describeCreateOrderError(error: OrdersApiError, lines: readonly CartLine[], tableNumber: number | null): string {
  switch (error.kind) {
    case "invalid": {
      const messages = [...new Set(error.issues.map((issue) => describeIssue(issue, lines)))];
      return messages.length === 0 ? `Revisá el pedido e ${RETRY.toLowerCase()}` : messages.join(" ");
    }
    case "conflict":
      if (error.code === "table_disabled") {
        return `La ${tableNumber === null ? "mesa" : formatTableLabel(tableNumber)} está deshabilitada. Elegí otra mesa.`;
      }
      if (error.code === "product_not_orderable") {
        const name = lines.find((line) => line.productId === error.productId)?.name;
        return name
          ? `${name} ya no se puede pedir. Quitalo del pedido para continuar.`
          : "Un producto del pedido ya no se puede pedir. Revisá el pedido.";
      }
      return `No pudimos crear el pedido. ${RETRY}`;
    case "network":
      return `No pudimos crear el pedido. ${CHECK_CONNECTION}`;
    default:
      return `No pudimos crear el pedido. ${RETRY}`;
  }
}

export function describeLoadError(error: EntryLoadError): string {
  return `No pudimos cargar la carta y las mesas. ${error.kind === "network" ? CHECK_CONNECTION : RETRY}`;
}
