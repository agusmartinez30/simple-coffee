import { ArrowLeftRight, Banknote, CreditCard, type LucideIcon } from "lucide-react";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/features/table-session";

export type PaymentOption = {
  method: PaymentMethod;
  label: string;
  description: string;
  icon: LucideIcon;
};

const DETAILS: Record<PaymentMethod, { description: string; icon: LucideIcon }> = {
  cash: { description: "Te acercamos la cuenta a la mesa", icon: Banknote },
  transfer: { description: "Te pasamos el alias para transferir", icon: ArrowLeftRight },
  debit: { description: "Te acercamos el posnet a la mesa", icon: CreditCard },
};

/** Payment options of the bill request sheet, in display order. */
export const PAYMENT_OPTIONS: readonly PaymentOption[] = PAYMENT_METHODS.map((method) => ({
  method,
  label: PAYMENT_METHOD_LABELS[method],
  ...DETAILS[method],
}));
