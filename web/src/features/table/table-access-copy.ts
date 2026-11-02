import { LoaderCircle, QrCode, WifiOff, type LucideIcon } from "lucide-react";
import type { TableAccessState } from "@/features/table-access";

/** Why "Mi mesa" cannot show the table yet. */
export type TableAccessView = "checking" | "missing" | "rejected" | "offline";

export type TableAccessCopy = {
  title: string;
  supporting: string;
  cardIcon: LucideIcon;
  cardTitle: string;
  cardText: string;
  /** Footer hint below the actions. */
  note?: string;
  /** Only the offline variant can retry: a rejected QR needs a new scan. */
  retryLabel?: string;
};

/** The blocking card to show instead of the table, or null once the table is valid. */
export function getTableAccessView(state: TableAccessState): TableAccessView | null {
  switch (state.status) {
    case "valid":
      return null;
    case "idle":
    case "checking":
      return "checking";
    case "invalid":
      return state.reason;
    case "offline":
      return "offline";
  }
}

/** Copy of the "Mi mesa" access card; `rejected` is design 09E · Sesión inválida. */
export const TABLE_ACCESS_COPY: Record<TableAccessView, TableAccessCopy> = {
  checking: {
    title: "Buscando tu mesa",
    supporting: "Estamos validando el QR de tu mesa.",
    cardIcon: LoaderCircle,
    cardTitle: "Validando el QR",
    cardText: "Esto lleva solo un momento.",
  },
  missing: {
    title: "Escaneá el QR de tu mesa",
    supporting: "Así podés ver la cuenta y pedir desde la mesa.",
    cardIcon: QrCode,
    cardTitle: "Sesión no disponible",
    cardText: "Para ver la cuenta y hacer pedidos, escaneá el código QR que está en tu mesa. Mientras tanto, podés explorar la carta.",
    note: "¿No encontrás el QR? Consultá al personal.",
  },
  rejected: {
    title: "Esta sesión ya no está disponible",
    supporting: "El QR puede haber vencido o la mesa ya inició una nueva sesión.",
    cardIcon: QrCode,
    cardTitle: "Sesión no disponible",
    cardText: "Este código ya no corresponde a una mesa activa. No podemos mostrar ni modificar la cuenta.",
    note: "Escaneá un nuevo QR o consultá al personal.",
  },
  offline: {
    title: "No pudimos validar tu mesa",
    supporting: "Revisá tu conexión e intentá de nuevo.",
    cardIcon: WifiOff,
    cardTitle: "Sin conexión",
    cardText: "No pudimos comunicarnos con el café. Hasta validar tu mesa no podés ver la cuenta ni hacer pedidos.",
    retryLabel: "Reintentar",
  },
};
