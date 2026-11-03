"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { useMenu } from "@/features/menu/MenuProvider";
import type { Ars } from "@/mocks/types";
import {
  cartReducer,
  emptyCart,
  parseStoredCart,
  selectItemCount,
  selectSubtotal,
  type CartLine,
} from "./cart-reducer";

const STORAGE_KEY = "cafe-central:cart:v1";

type AddItemInput = {
  productId: string;
  choiceIds?: readonly string[];
  note?: string;
  quantity?: number;
};

export type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: Ars;
  /** False until the persisted cart has been restored after mount. */
  hydrated: boolean;
  addItem: (input: AddItemInput) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  remove: (lineId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart() {
  try {
    return parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return emptyCart;
  }
}

function writeStoredCart(value: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore quota or availability errors: the cart still works in memory.
  }
}

/**
 * Cart state for the whole app; prices come from the menu, so it renders inside `<MenuProvider>`. It starts empty on the server and on the first client
 * render (hydration-safe), then restores the persisted cart after mount.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const { menu } = useMenu();
  const [state, dispatch] = useReducer(cartReducer, emptyCart);
  const hasRestored = useRef(false);
  const [hydrated, markHydrated] = useReducer(() => true, false);

  useEffect(() => {
    dispatch({ type: "hydrate", state: readStoredCart() });
    markHydrated();
  }, []);

  useEffect(() => {
    // Skip the initial empty state so it never overwrites the stored cart before restore.
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    writeStoredCart(JSON.stringify(state));
  }, [state]);

  const value = useMemo<CartContextValue>(
    () => ({
      lines: state.lines,
      itemCount: selectItemCount(state),
      subtotal: selectSubtotal(state, menu),
      hydrated,
      addItem: (input) => dispatch({ type: "add", ...input }),
      increment: (lineId) => dispatch({ type: "increment", lineId }),
      decrement: (lineId) => dispatch({ type: "decrement", lineId }),
      remove: (lineId) => dispatch({ type: "remove", lineId }),
      clear: () => dispatch({ type: "clear" }),
    }),
    [state, hydrated, menu],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within <CartProvider>");
  return context;
}
