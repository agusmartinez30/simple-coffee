import {
  ArrowLeft,
  BellRing,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { TABLE } from "@/mocks/table";

/** Forced variants of screen 06, reachable with `?state=`. */
export const ORDER_OUTCOME_STATES = ["pending", "error", "closed"] as const;
export type OrderOutcomeState = (typeof ORDER_OUTCOME_STATES)[number];

export type OrderOutcomeCopy = {
  icon: LucideIcon;
  spinIcon?: boolean;
  badge: string;
  headline: string;
  headlineSize: number;
  heroText: string;
  artOpacity: number;
  cardTitle: string;
  cardText: string;
  noticeTitle: string;
  noticeText: string;
  primaryLabel: string;
  primaryIcon: LucideIcon;
  secondaryLabel: string;
  secondaryIcon: LucideIcon;
  secondaryHref: string;
};

/** Copy for screens 06A (pending), 06B (send error) and 06C (closed account). */
export const ORDER_OUTCOMES: Record<OrderOutcomeState, OrderOutcomeCopy> = {
  pending: {
    icon: LoaderCircle,
    spinIcon: true,
    badge: "Confirmación pendiente",
    headline: "Confirmando tu pedido",
    headlineSize: 32,
    heroText: "Estamos verificando que el restaurante lo haya recibido.",
    artOpacity: 0.85,
    cardTitle: "Un momento, por favor",
    cardText: "No mostramos un pedido hasta confirmar que existe en el sistema del restaurante.",
    noticeTitle: "Todavía no limpiamos tu carrito",
    noticeText:
      "Esperamos la confirmación del restaurante antes de mostrar un número de pedido.",
    primaryLabel: "Verificar nuevamente",
    primaryIcon: RefreshCw,
    secondaryLabel: "Volver a mi pedido",
    secondaryIcon: ShoppingBag,
    secondaryHref: "/order",
  },
  error: {
    icon: CircleAlert,
    badge: "Error de envío",
    headline: "No pudimos enviarlo",
    headlineSize: 34,
    heroText: "Algo interrumpió el envío. Tu pedido todavía no fue confirmado.",
    artOpacity: 0.55,
    cardTitle: "El pedido no se creó",
    cardText:
      "No se sumó ningún consumo a la cuenta compartida. Podés intentarlo otra vez.",
    noticeTitle: "Tu carrito sigue guardado",
    noticeText:
      "Reintentá cuando tengas conexión. No se agregó nada a la cuenta de la mesa.",
    primaryLabel: "Reintentar envío",
    primaryIcon: RefreshCw,
    secondaryLabel: "Volver a mi pedido",
    secondaryIcon: ShoppingBag,
    secondaryHref: "/order",
  },
  closed: {
    icon: LockKeyhole,
    badge: "Cuenta cerrada",
    headline: "La cuenta ya está cerrada",
    headlineSize: 32,
    heroText: `La mesa ${TABLE.number} ya no acepta nuevos pedidos desde el menú.`,
    artOpacity: 0.85,
    cardTitle: "La cuenta compartida ya cerró",
    cardText:
      "Si necesitás pedir algo más, hablá con el personal para que vuelva a abrir la mesa.",
    noticeTitle: "No se pueden sumar nuevos pedidos",
    noticeText: `Solo el personal puede reabrir la cuenta compartida de la mesa ${TABLE.number}.`,
    primaryLabel: "Avisar al personal",
    primaryIcon: BellRing,
    secondaryLabel: "Volver al menú",
    secondaryIcon: ArrowLeft,
    secondaryHref: "/explore",
  },
};
