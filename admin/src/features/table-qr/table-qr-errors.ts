import type { TableQrApiError } from "./table-qr-api";

/** What the screen was doing when the API failed. */
export type TableQrOperation = "load" | "regenerate";

const FAILED: Record<TableQrOperation, string> = {
  load: "No pudimos cargar las mesas.",
  regenerate: "No pudimos regenerar el código QR.",
};

/** Spanish notice copy for an API error. `unauthorized` never shows: the session guard sends to /login. */
export function describeTableQrError(error: TableQrApiError, operation: TableQrOperation): string {
  switch (error.kind) {
    case "network":
      return `${FAILED[operation]} Revisá tu conexión e intentá de nuevo.`;
    case "not-found":
      return "Esa mesa ya no existe. Actualizamos la lista.";
    default:
      return `${FAILED[operation]} Intentá de nuevo.`;
  }
}
