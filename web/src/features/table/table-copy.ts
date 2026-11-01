import { CircleDot, WifiOff, type LucideIcon } from "lucide-react";
import type { TableView } from "./table-view";

export type TableViewCopy = {
  /** Two-line editorial heading (07, 07C) or a single display heading (07D). */
  heading:
    | { kind: "editorial"; line: string; accent: string; supporting?: string }
    | { kind: "display"; title: string; supporting: string };
  statusLabel: string;
  statusIcon: LucideIcon;
  statusMeta: string;
  historyHint: string;
  notice?: { icon: LucideIcon; text: string };
  note?: string;
  footer?: { primaryLabel: string; hint?: string };
};

/** Copy of screen 07 and its variants. */
export const TABLE_VIEW_COPY: Record<TableView, TableViewCopy> = {
  open: {
    heading: {
      kind: "editorial",
      line: "Lo bueno se",
      accent: "comparte.",
      supporting: "Todos los pedidos de tu mesa, en un solo lugar.",
    },
    statusLabel: "Pedidos de tu mesa",
    statusIcon: CircleDot,
    statusMeta: "Actualizado en tiempo real",
    historyHint: "Tocá para ver el detalle",
  },
  error: {
    heading: {
      kind: "display",
      title: "Error de conexión",
      supporting: "Mostramos la última información disponible.",
    },
    statusLabel: "Error de conexión",
    statusIcon: WifiOff,
    // The time is filled in by the screen from the latest known order.
    statusMeta: "Última actualización",
    historyHint: "Historial disponible",
    notice: {
      icon: WifiOff,
      text: "No pudimos actualizar los pedidos. Reintentá para confirmar pedidos y totales.",
    },
    note: "Los totales pueden estar desactualizados hasta recuperar la conexión.",
    footer: {
      primaryLabel: "Reintentar",
      hint: "Conservamos la última información recibida",
    },
  },
  empty: {
    heading: { kind: "editorial", line: "La mesa está", accent: "lista para compartir." },
    statusLabel: "Pedidos de tu mesa",
    statusIcon: CircleDot,
    statusMeta: "Actualizado ahora",
    historyHint: "",
    footer: {
      primaryLabel: "Explorar el menú",
      hint: "Los pedidos confirmados se sincronizan en tiempo real",
    },
  },
};
