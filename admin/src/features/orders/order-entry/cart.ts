import type { NewOrderInput } from "../orders-api";
import type { EntryOptionGroup, EntryProduct } from "./entry-types";

/**
 * Cart of "Nuevo pedido": pure state and rules. Option checks mirror `prepareOrder` in
 * `api/src/modules/orders/domain/order-pricing.ts`; the total is display-only, the API prices
 * the order from the catalog.
 */

export const LINE_QUANTITY_MIN = 1;
export const LINE_QUANTITY_MAX = 99;
/** Same limits as the API (`ORDER_NOTE_MAX_LENGTH`, `ITEM_NOTE_MAX_LENGTH`). */
export const ORDER_NOTE_MAX_LENGTH = 140;
export const LINE_NOTE_MAX_LENGTH = 140;

export type CartLine = {
  /** Product and its sorted options: identical choices share one line. */
  key: string;
  productId: string;
  name: string;
  /** Product price plus the chosen option deltas. */
  unitPrice: number;
  /** In the product's group and option order. */
  optionIds: string[];
  /** Chosen option names, e.g. "Grande · Shot extra"; empty without options. */
  optionSummary: string;
  allowsNote: boolean;
  quantity: number;
  note: string;
};

export type CartState = {
  tableNumber: number | null;
  lines: CartLine[];
  note: string;
};

export type CartAction =
  | { type: "select-table"; tableNumber: number | null }
  /** Adds one unit; refused when the options break the product's rules. */
  | { type: "add"; product: EntryProduct; optionIds: readonly string[] }
  | { type: "increment"; key: string }
  | { type: "decrement"; key: string }
  | { type: "remove"; key: string }
  | { type: "set-line-note"; key: string; note: string }
  | { type: "set-note"; note: string }
  | { type: "reset" };

export type OptionIssue =
  | { code: "unknown_option" | "duplicate_option"; optionId: string }
  | { code: "missing_required_group" | "too_many_options"; groupId: string };

export function createCart(): CartState {
  return { tableNumber: null, lines: [], note: "" };
}

const groupMax = (group: EntryOptionGroup) => (group.selection === "single" ? 1 : group.max);

const groupOf = (product: EntryProduct, optionId: string) =>
  product.optionGroups.find((group) => group.options.some((option) => option.id === optionId));

/** Starting choice of the option picker: the default option of each required group. */
export function initialOptionSelection(product: EntryProduct): string[] {
  return product.optionGroups.flatMap((group) =>
    group.required && group.defaultOptionId !== null && group.options.some((option) => option.id === group.defaultOptionId)
      ? [group.defaultOptionId]
      : [],
  );
}

/**
 * Picker click on `optionId`: a single group takes it instead of its current choice; a multiple
 * group toggles it, never past its max. Unknown options leave the selection unchanged.
 */
export function toggleOption(product: EntryProduct, selection: readonly string[], optionId: string): string[] {
  const group = groupOf(product, optionId);
  if (!group) return [...selection];
  const inGroup = (id: string) => group.options.some((option) => option.id === id);
  if (group.selection === "single") return [...selection.filter((id) => !inGroup(id)), optionId];
  if (selection.includes(optionId)) return selection.filter((id) => id !== optionId);
  const max = groupMax(group);
  if (max !== null && selection.filter(inGroup).length >= max) return [...selection];
  return [...selection, optionId];
}

/** Drops the choices of a group ("Sin elección" on an optional single group). */
export function clearGroupSelection(product: EntryProduct, selection: readonly string[], groupId: string): string[] {
  const group = product.optionGroups.find((candidate) => candidate.id === groupId);
  if (!group) return [...selection];
  return selection.filter((id) => !group.options.some((option) => option.id === id));
}

/**
 * Checks chosen options like the API: known, not repeated, required groups covered (their default
 * counts when nothing was chosen) and no group past its max.
 */
export function optionIssues(product: EntryProduct, optionIds: readonly string[]): OptionIssue[] {
  const issues: OptionIssue[] = [];
  const chosen = new Set<string>();
  for (const optionId of optionIds) {
    if (chosen.has(optionId)) issues.push({ code: "duplicate_option", optionId });
    else if (!groupOf(product, optionId)) issues.push({ code: "unknown_option", optionId });
    chosen.add(optionId);
  }
  for (const group of product.optionGroups) {
    const picked = group.options.filter((option) => chosen.has(option.id)).length;
    const hasDefault = group.options.some((option) => option.id === group.defaultOptionId);
    if (picked === 0 && group.required && !hasDefault) issues.push({ code: "missing_required_group", groupId: group.id });
    const max = groupMax(group);
    if (max !== null && picked > max) issues.push({ code: "too_many_options", groupId: group.id });
  }
  return issues;
}

/** The options a valid choice resolves to, in product order, required defaults filled in. */
function resolveOptions(product: EntryProduct, optionIds: readonly string[]) {
  const chosen = new Set(optionIds);
  return product.optionGroups.flatMap((group) => {
    const picked = group.options.filter((option) => chosen.has(option.id));
    if (picked.length > 0 || !group.required) return picked;
    return group.options.filter((option) => option.id === group.defaultOptionId);
  });
}

/** The line one unit of `product` with these options would add (also the option picker preview). */
export function toLine(product: EntryProduct, optionIds: readonly string[]): CartLine {
  const options = resolveOptions(product, optionIds);
  const ids = options.map((option) => option.id);
  return {
    key: `${product.id}|${[...ids].sort().join(",")}`,
    productId: product.id,
    name: product.name,
    unitPrice: product.price + options.reduce((sum, option) => sum + option.priceDelta, 0),
    optionIds: ids,
    optionSummary: options.map((option) => option.name).join(" · "),
    allowsNote: product.allowCustomerNotes,
    quantity: 1,
    note: "",
  };
}

const clampQuantity = (quantity: number) => Math.min(LINE_QUANTITY_MAX, Math.max(LINE_QUANTITY_MIN, quantity));

function updateLine(state: CartState, key: string, update: (line: CartLine) => CartLine): CartState {
  return { ...state, lines: state.lines.map((line) => (line.key === key ? update(line) : line)) };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "select-table":
      return { ...state, tableNumber: action.tableNumber };
    case "add": {
      if (optionIssues(action.product, action.optionIds).length > 0) return state;
      const line = toLine(action.product, action.optionIds);
      return state.lines.some((existing) => existing.key === line.key)
        ? updateLine(state, line.key, (existing) => ({ ...existing, quantity: clampQuantity(existing.quantity + 1) }))
        : { ...state, lines: [...state.lines, line] };
    }
    case "increment":
      return updateLine(state, action.key, (line) => ({ ...line, quantity: clampQuantity(line.quantity + 1) }));
    case "decrement":
      return updateLine(state, action.key, (line) => ({ ...line, quantity: clampQuantity(line.quantity - 1) }));
    case "remove":
      return { ...state, lines: state.lines.filter((line) => line.key !== action.key) };
    case "set-line-note":
      return updateLine(state, action.key, (line) =>
        line.allowsNote ? { ...line, note: action.note.slice(0, LINE_NOTE_MAX_LENGTH) } : line,
      );
    case "set-note":
      return { ...state, note: action.note.slice(0, ORDER_NOTE_MAX_LENGTH) };
    case "reset":
      return createCart();
  }
}

export const cartTotal = (lines: readonly CartLine[]) => lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

export const cartItemCount = (lines: readonly CartLine[]) => lines.reduce((sum, line) => sum + line.quantity, 0);

export const canSubmitCart = (state: CartState) => state.tableNumber !== null && state.lines.length > 0;

/** `POST /orders` body, lines in cart order (API issue paths `lines.N` point back to them); null when not ready. */
export function buildOrderInput(state: CartState): NewOrderInput | null {
  if (state.tableNumber === null || state.lines.length === 0) return null;
  const note = state.note.trim();
  return {
    tableNumber: state.tableNumber,
    ...(note === "" ? {} : { note }),
    lines: state.lines.map((line) => {
      const lineNote = line.allowsNote ? line.note.trim() : "";
      return {
        productId: line.productId,
        quantity: line.quantity,
        ...(line.optionIds.length === 0 ? {} : { optionIds: line.optionIds }),
        ...(lineNote === "" ? {} : { note: lineNote }),
      };
    }),
  };
}
