/** How the guest will pay the bill. */
export type PaymentMethod = "cash" | "transfer" | "debit";

/** Payment methods in display order. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = ["cash", "transfer", "debit"];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  debit: "Débito",
};

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as readonly string[]).includes(value);
}
