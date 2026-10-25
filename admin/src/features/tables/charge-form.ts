import { PAYMENT_METHODS, getPaymentMethodLabel } from "@/mocks/service-day";
import type { BillPaymentMethod, CollectionMethod, PaymentSettings } from "@/mocks/types";
import { formatPrice } from "@/shared/lib/format-price";

/**
 * "Cobrar mesa" form: staff chooses how the table pays and whether it leaves a tip before the
 * collection is recorded. Pure helpers; the dialog only renders what they return.
 */

export type ChargeMethodOption = { id: CollectionMethod; label: string };

/** Tip percentages offered as chips, computed over the table total. */
export const TIP_PERCENTS = [10, 15] as const;

export type TipPercent = (typeof TIP_PERCENTS)[number];

/** "Sin propina", a percentage chip, or "Otro monto" with the text staff typed. */
export type TipChoice = { kind: "none" } | { kind: "percent"; value: TipPercent } | { kind: "amount"; text: string };

export type ChargeForm = {
  tableNumber: number;
  /** null until staff picks a method: the customer's preference is only a hint. */
  method: CollectionMethod | null;
  tip: TipChoice;
};

export type ChargeSummary = { subtotal: string; tip: string; total: string };

const COLLECTION_METHODS: readonly string[] = ["cash", "card", "transfer"] satisfies CollectionMethod[];

const isCollectionMethod = (id: string): id is CollectionMethod => COLLECTION_METHODS.includes(id);

/** "Medio de pago" options: the collection methods the venue accepts (06), in the 06 order. */
export function getChargeMethodOptions(settings: PaymentSettings): ChargeMethodOption[] {
  return PAYMENT_METHODS.flatMap(({ id }) =>
    isCollectionMethod(id) && settings.methods[id] ? [{ id, label: getPaymentMethodLabel(id) }] : [],
  );
}

/** Method the bill request points at (same mapping as the 05 history); null without a request. */
const METHOD_BY_PREFERENCE: Record<BillPaymentMethod, CollectionMethod> = {
  table: "card",
  register: "cash",
  transfer: "transfer",
};

export function getSuggestedMethod(preference: BillPaymentMethod | undefined): CollectionMethod | null {
  return preference ? METHOD_BY_PREFERENCE[preference] : null;
}

export function createChargeForm(tableNumber: number): ChargeForm {
  return { tableNumber, method: null, tip: { kind: "none" } };
}

/** Whole pesos, optionally with "$" and thousands dots ("1.500"). Blank is no tip; anything else is null. */
const AMOUNT = /^(\d+|\d{1,3}(\.\d{3})+)$/;

export function parseTipAmount(text: string): number | null {
  const trimmed = text.trim().replace(/^\$\s*/, "");
  if (trimmed === "") return 0;
  return AMOUNT.test(trimmed) ? Number(trimmed.replaceAll(".", "")) : null;
}

/** Tip in ARS for the table total, or null when the free amount is not valid. */
export function resolveTip(choice: TipChoice, total: number): number | null {
  switch (choice.kind) {
    case "none":
      return 0;
    case "percent":
      return Math.round((total * choice.value) / 100);
    case "amount":
      return parseTipAmount(choice.text);
  }
}

/** "Subtotal", "Propina" and "Total a cobrar"; the tip is not part of the bill amount. */
export function getChargeSummary(total: number, tip: number): ChargeSummary {
  return { subtotal: formatPrice(total), tip: formatPrice(tip), total: formatPrice(total + tip) };
}

/** "Registrar cobro" needs a method and a valid tip. */
export function canConfirmCharge(form: ChargeForm, total: number): boolean {
  return form.method !== null && resolveTip(form.tip, total) !== null;
}
