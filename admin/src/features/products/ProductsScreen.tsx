"use client";

import { useCallback, useReducer } from "react";
import { PRODUCTS } from "@/mocks/service-day";
import { useScreenState } from "@/shared/lib/use-screen-state";
import { saveProductAvailability } from "./product-availability";
import { CustomerPreview } from "./CustomerPreview";
import { ProductCatalogTable } from "./ProductCatalogTable";
import { ProductEditor } from "./ProductEditor";
import { ProductListFilters } from "./ProductListFilters";
import { ProductListHeader } from "./ProductListHeader";
import { ProductListMetrics } from "./ProductListMetrics";
import {
  createProductsState,
  getEditorView,
  getProductsListView,
  productsReducer,
  setFilter,
  type ProductsAction,
  type ProductsState,
} from "./products-state";

/**
 * Forced variants: `edit` (07B: the Cappuccino with "Tomar" added and not saved yet), `preview`
 * (07C of that same draft), `new` (empty "Nuevo producto" form) and `errors` (the Cappuccino
 * after publishing without a name and with an invalid price; not in the exports) and `saving`
 * (07A row states: Limonada "Actualizando…" and Cheesecake "No se pudo guardar"; the pending
 * save never settles in this variant).
 */
export const PRODUCTS_FORCED_STATES = ["edit", "preview", "new", "errors", "saving"] as const;

type ForcedState = (typeof PRODUCTS_FORCED_STATES)[number];

const EDITED_CAPPUCCINO: ProductsAction[] = [
  { type: "open-editor", id: "cappuccino" },
  { type: "toggle-moment", moment: "tomar" },
];

const FORCED_ACTIONS: Record<ForcedState, ProductsAction[]> = {
  edit: EDITED_CAPPUCCINO,
  preview: [...EDITED_CAPPUCCINO, { type: "open-preview" }],
  new: [{ type: "open-new" }],
  errors: [
    { type: "open-editor", id: "cappuccino" },
    { type: "set-field", field: "name", value: "" },
    { type: "set-field", field: "price", value: "3,8" },
    { type: "save", mode: "publish" },
  ],
  saving: [
    { type: "start-availability-save", id: "limonada", available: false },
    { type: "set-availability", id: "cheesecake", available: false },
    { type: "start-availability-save", id: "cheesecake", available: true },
    { type: "finish-availability-save", id: "cheesecake", ok: false },
  ],
};

function initProductsState(forcedState: ForcedState | null): ProductsState {
  const state = createProductsState(PRODUCTS);
  if (!forcedState) return state;
  return { ...FORCED_ACTIONS[forcedState].reduce(productsReducer, state), notice: null };
}

/**
 * 07 · Productos. Container: owns the catalogue as edited in this session (pure
 * `productsReducer`, seeded from the canonical `PRODUCTS`) and which of the three views is open:
 * the list (07A), the editor (07B) or the customer preview (07C) of the editor's draft. Saving,
 * duplicating, archiving and the availability switches only change the in-memory list; a switch
 * goes through a simulated save (`saveProductAvailability`) before it commits or reverts.
 */
export function ProductsScreen() {
  const forcedState = useScreenState(PRODUCTS_FORCED_STATES);
  const [state, dispatch] = useReducer(productsReducer, forcedState, initProductsState);
  const editorView = getEditorView(state);

  const changeAvailability = useCallback(async (id: string, available: boolean) => {
    dispatch({ type: "start-availability-save", id, available });
    try {
      await saveProductAvailability(id, available);
      dispatch({ type: "finish-availability-save", id, ok: true });
    } catch {
      dispatch({ type: "finish-availability-save", id, ok: false });
    }
  }, []);

  let content;
  if (state.editor && state.screen === "preview") {
    content = <CustomerPreview state={state} onAction={dispatch} />;
  } else if (state.editor && editorView && state.screen === "editor") {
    content = <ProductEditor editor={state.editor} view={editorView} onAction={dispatch} />;
  } else {
    const view = getProductsListView(state);
    content = (
      // From `lg` the list fills the viewport under the top bar, as in the 1440×900 export; below
      // it the page grows with its cards and scrolls.
      <div className="flex min-h-[calc(100dvh-var(--topbar-h))] flex-col gap-3 px-4 pt-4 pb-6 lg:h-[calc(100dvh-var(--topbar-h))] lg:min-h-[700px] lg:px-7 lg:pt-[18px] lg:pb-4">
        <ProductListHeader onCreate={() => dispatch({ type: "open-new" })} />
        <ProductListMetrics metrics={view.metrics} support={view.metricSupport} />
        <ProductListFilters
          filters={state.filters}
          canClear={view.hasActiveFilters}
          onQueryChange={(query) => dispatch({ type: "set-query", query })}
          onFilterChange={(filter, value) => dispatch(setFilter(filter, value))}
          onClear={() => dispatch({ type: "reset-filters" })}
        />
        <ProductCatalogTable
          rows={view.rows}
          countLabel={view.countLabel}
          summaryLabel={view.summaryLabel}
          page={view.page}
          pageCount={view.pageCount}
          empty={view.empty}
          onPageChange={(page) => dispatch({ type: "set-page", page })}
          onClearFilters={() => dispatch({ type: "reset-filters" })}
          onEdit={(id) => dispatch({ type: "open-editor", id })}
          onDuplicate={(id) => dispatch({ type: "duplicate", id })}
          onArchive={(id) => dispatch({ type: "archive", id })}
          onRestore={(id) => dispatch({ type: "restore", id })}
          onAvailabilityChange={changeAvailability}
        />
      </div>
    );
  }

  return (
    <>
      {content}
      <p role="status" className="sr-only">
        {state.notice}
      </p>
    </>
  );
}
