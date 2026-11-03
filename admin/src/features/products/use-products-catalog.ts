"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { sessionStore } from "@/features/auth/session-store";
import { saveProductAvailability } from "./product-availability";
import type { SaveMode } from "./product-form";
import {
  archiveProduct,
  createProduct,
  listProductCategories,
  listProducts,
  restoreProduct,
  setProductAvailability,
  updateProduct,
  type ProductsApiError,
} from "./products-api";
import {
  getDuplicateRequest,
  getSaveRequest,
  productsReducer,
  type ProductListOperation,
  type ProductsAction,
  type ProductsState,
} from "./products-state";

/** `loading`/`error`: the first load (or a retry) has not answered yet, or failed. */
export type CatalogLoadStatus = "loading" | "error" | "ready";

/** A missing session is handled by the auth guard, which sends the staff member to /login. */
function handleError(error: ProductsApiError) {
  if (error.kind === "unauthorized") sessionStore.signOut();
}

/**
 * The products screen on the API: loads the catalogue and its categories, and sends saves,
 * duplicates, archives, restores and availability switches, committing the product the API
 * answers into the pure `productsReducer`. `offline` (the forced `?state=` variants) never calls
 * the API: it keeps the mock catalogue in memory, with the simulated availability save.
 */
export function useProductsCatalog(
  offline: boolean,
  init: () => ProductsState,
): {
  state: ProductsState;
  status: CatalogLoadStatus;
  retry: () => void;
  /** Every view action; saves and list actions go through the API unless offline. */
  onAction: (action: ProductsAction) => void;
  changeAvailability: (id: string, available: boolean) => void;
} {
  const [state, dispatch] = useReducer(productsReducer, undefined, init);
  const [status, setStatus] = useState<CatalogLoadStatus>(offline ? "ready" : "loading");
  /** Bumped by "Reintentar" to load again. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (offline) return;
    let active = true;
    void Promise.all([listProducts(), listProductCategories()]).then(([products, categories]) => {
      if (!active) return;
      if (products.ok && categories.ok) {
        dispatch({ type: "loaded", products: products.value, categories: categories.value });
        setStatus("ready");
        return;
      }
      if (!products.ok) handleError(products.error);
      else if (!categories.ok) handleError(categories.error);
      setStatus("error");
    });
    return () => {
      active = false;
    };
  }, [offline, attempt]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((count) => count + 1);
  }, []);

  async function save(mode: SaveMode) {
    if (state.editor?.saving) return;
    const request = getSaveRequest(state, mode);
    // A blocked form: the reducer marks the fields without calling the API.
    if (!request) {
      dispatch({ type: "save", mode });
      return;
    }
    dispatch({ type: "save-started" });
    const result =
      request.productId === null ? await createProduct(request.body) : await updateProduct(request.productId, request.body);
    if (result.ok) {
      dispatch({ type: "save-succeeded", product: result.value, mode });
      return;
    }
    handleError(result.error);
    dispatch({ type: "save-failed", issues: result.error.kind === "invalid" ? result.error.issues : [] });
  }

  async function runListAction(operation: ProductListOperation, id: string) {
    const product = state.products.find((candidate) => candidate.id === id);
    if (!product) return;
    if (operation === "duplicate") {
      const body = getDuplicateRequest(state, id);
      if (!body) return;
      const result = await createProduct(body);
      if (result.ok) dispatch({ type: "duplicated", sourceId: id, product: result.value });
      else fail(result.error);
      return;
    }
    if (operation === "archive" ? product.archived : !product.archived) return;
    const result = operation === "archive" ? await archiveProduct(id) : await restoreProduct(id);
    if (result.ok) dispatch({ type: operation === "archive" ? "archived" : "restored", product: result.value });
    else fail(result.error);

    function fail(error: ProductsApiError) {
      handleError(error);
      dispatch({ type: "product-action-failed", id, action: operation });
    }
  }

  function onAction(action: ProductsAction) {
    if (offline) {
      dispatch(action);
      return;
    }
    switch (action.type) {
      case "save":
        void save(action.mode);
        return;
      case "duplicate":
      case "archive":
      case "restore":
        void runListAction(action.type, action.id);
        return;
      default:
        dispatch(action);
    }
  }

  async function changeAvailability(id: string, available: boolean) {
    const start: ProductsAction = { type: "start-availability-save", id, available };
    // Archived products, unchanged values and saves already pending are left alone.
    if (productsReducer(state, start) === state) return;
    dispatch(start);
    if (offline) {
      try {
        await saveProductAvailability(id, available);
        dispatch({ type: "finish-availability-save", id, ok: true });
      } catch {
        dispatch({ type: "finish-availability-save", id, ok: false });
      }
      return;
    }
    const result = await setProductAvailability(id, available);
    if (result.ok) {
      dispatch({ type: "finish-availability-save", id, ok: true, product: result.value });
      return;
    }
    handleError(result.error);
    dispatch({ type: "finish-availability-save", id, ok: false });
  }

  return { state, status, retry, onAction, changeAvailability: (id, available) => void changeAvailability(id, available) };
}
