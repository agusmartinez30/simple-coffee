import type { OrdersApiError } from "./orders-api";

/** What the board was doing when the API failed. */
export type OrdersOperation = "load" | "advance" | "cancel";

const FAILED: Record<OrdersOperation, string> = {
  load: "No pudimos actualizar los pedidos.",
  advance: "No pudimos cambiar el estado del pedido.",
  cancel: "No pudimos cancelar el pedido.",
};

/** Spanish notice copy for an API error. `unauthorized` never shows: the session guard sends to /login. */
export function describeOrdersError(error: OrdersApiError, operation: OrdersOperation): string {
  switch (error.kind) {
    case "network":
      return `${FAILED[operation]} Revisá tu conexión e intentá de nuevo.`;
    case "not-found":
      return "Ese pedido ya no existe. Actualizamos el tablero.";
    case "conflict":
      return error.code === "invalid_transition"
        ? "Ese pedido ya cambió de estado. Actualizamos el tablero."
        : `${FAILED[operation]} Intentá de nuevo.`;
    default:
      return `${FAILED[operation]} Intentá de nuevo.`;
  }
}
