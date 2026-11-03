import { findMenuProduct } from "@/features/menu/menu-mapper";
import { getUnitPrice } from "@/features/menu/product-pricing";
import type { Ars, Menu } from "@/mocks/types";

export type CartLine = {
  /** Deterministic key: identical product + choices + note share one line. */
  id: string;
  productId: string;
  choiceIds: string[];
  note?: string;
  quantity: number;
};

export type CartState = {
  lines: CartLine[];
};

export type CartAction =
  | { type: "add"; productId: string; choiceIds?: readonly string[]; note?: string; quantity?: number }
  | { type: "increment"; lineId: string }
  | { type: "decrement"; lineId: string }
  | { type: "remove"; lineId: string }
  | { type: "clear" }
  | { type: "hydrate"; state: CartState };

export const emptyCart: CartState = { lines: [] };

function normalizeNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim();
  return trimmed ? trimmed : undefined;
}

export function getLineKey(productId: string, choiceIds: readonly string[], note?: string): string {
  return [productId, [...choiceIds].sort().join(","), normalizeNote(note) ?? ""].join("|");
}

function updateQuantity(state: CartState, lineId: string, change: number): CartState {
  const lines = state.lines
    .map((line) => (line.id === lineId ? { ...line, quantity: line.quantity + change } : line))
    .filter((line) => line.quantity > 0);
  return { lines };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const quantity = action.quantity ?? 1;
      if (quantity <= 0) return state;
      const choiceIds = [...(action.choiceIds ?? [])].sort();
      const note = normalizeNote(action.note);
      const id = getLineKey(action.productId, choiceIds, note);
      if (state.lines.some((line) => line.id === id)) {
        return updateQuantity(state, id, quantity);
      }
      return {
        lines: [...state.lines, { id, productId: action.productId, choiceIds, note, quantity }],
      };
    }
    case "increment":
      return updateQuantity(state, action.lineId, 1);
    case "decrement":
      // Decrementing a line with quantity 1 removes it.
      return updateQuantity(state, action.lineId, -1);
    case "remove":
      return { lines: state.lines.filter((line) => line.id !== action.lineId) };
    case "clear":
      return emptyCart;
    case "hydrate":
      return action.state;
  }
}

export function selectItemCount(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function selectLineUnitPrice(line: CartLine, menu: Menu): Ars | undefined {
  const product = findMenuProduct(menu, line.productId);
  return product ? getUnitPrice(product, line.choiceIds) : undefined;
}

/** Sum of every line at its configured unit price; products not on the menu are skipped. */
export function selectSubtotal(state: CartState, menu: Menu): Ars {
  return state.lines.reduce((sum, line) => sum + (selectLineUnitPrice(line, menu) ?? 0) * line.quantity, 0);
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.id === "string" &&
    typeof line.productId === "string" &&
    Array.isArray(line.choiceIds) &&
    line.choiceIds.every((id) => typeof id === "string") &&
    (line.note === undefined || typeof line.note === "string") &&
    typeof line.quantity === "number" &&
    Number.isInteger(line.quantity) &&
    line.quantity > 0
  );
}

/** Parses persisted cart JSON, falling back to an empty cart on any malformed data. */
export function parseStoredCart(raw: string | null): CartState {
  if (!raw) return emptyCart;
  try {
    const parsed: unknown = JSON.parse(raw);
    const lines = (parsed as { lines?: unknown })?.lines;
    if (!Array.isArray(lines) || !lines.every(isCartLine)) return emptyCart;
    return { lines };
  } catch {
    return emptyCart;
  }
}
