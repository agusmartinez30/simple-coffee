"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { sessionStore } from "@/features/auth/session-store";
import type { Order } from "../order-types";
import { createOrder } from "../orders-api";
import { buildOrderInput, cartReducer, createCart, type CartAction, type CartState } from "./cart";
import { loadEntryCatalog } from "./entry-api";
import { describeCreateOrderError, describeLoadError } from "./entry-errors";
import type { EntryCatalog } from "./entry-types";

export type EntryCatalogState =
  | { status: "loading" }
  | { status: "ready"; catalog: EntryCatalog }
  | { status: "failed"; message: string };

/**
 * "Nuevo pedido": loads the orderable products and enabled tables when the panel opens, keeps the
 * cart and sends it with `POST /orders`. A refused order keeps the cart and explains why; a lost
 * session signs out (the auth guard sends to /login).
 */
export function useOrderEntry({ onCreated }: { onCreated: (order: Order) => void }): {
  catalog: EntryCatalogState;
  retryCatalog: () => void;
  cart: CartState;
  update: (action: CartAction) => void;
  submitting: boolean;
  error: string | null;
  dismissError: () => void;
  submit: () => void;
} {
  const [catalog, setCatalog] = useState<EntryCatalogState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [cart, dispatch] = useReducer(cartReducer, undefined, createCart);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);

  useEffect(() => {
    let active = true;
    void loadEntryCatalog().then((result) => {
      if (!active) return;
      if (result.ok) setCatalog({ status: "ready", catalog: result.value });
      else if (result.error.kind === "unauthorized") sessionStore.signOut();
      else setCatalog({ status: "failed", message: describeLoadError(result.error) });
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retryCatalog = useCallback(() => {
    setCatalog({ status: "loading" });
    setAttempt((count) => count + 1);
  }, []);

  // Any change to the cart answers the last refusal, so its notice goes away.
  const update = useCallback((action: CartAction) => {
    setError(null);
    dispatch(action);
  }, []);

  const submit = useCallback(() => {
    const input = buildOrderInput(cart);
    if (input === null || sending.current) return;
    sending.current = true;
    setSubmitting(true);
    setError(null);
    void createOrder(input).then((result) => {
      sending.current = false;
      setSubmitting(false);
      if (result.ok) onCreated(result.value);
      else if (result.error.kind === "unauthorized") sessionStore.signOut();
      else setError(describeCreateOrderError(result.error, cart.lines, cart.tableNumber));
    });
  }, [cart, onCreated]);

  return { catalog, retryCatalog, cart, update, submitting, error, dismissError: () => setError(null), submit };
}
