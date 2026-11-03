"use client";

import { LoaderCircle, RotateCw, TriangleAlert } from "lucide-react";
import { PRODUCTS } from "@/mocks/service-day";
import { useScreenState } from "@/shared/lib/use-screen-state";
import { Notice } from "@/shared/ui";
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
import { useProductsCatalog } from "./use-products-catalog";

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

/** A forced variant replays its actions over the mock catalogue; the API path starts empty until it loads. */
function initProductsState(forcedState: ForcedState | null): ProductsState {
  if (!forcedState) return createProductsState([], { categories: [] });
  return { ...FORCED_ACTIONS[forcedState].reduce(productsReducer, createProductsState(PRODUCTS)), notice: null };
}

const PAGE_CLASSES =
  "flex min-h-[calc(100dvh-var(--topbar-h))] flex-col gap-3 px-4 pt-4 pb-6 lg:h-[calc(100dvh-var(--topbar-h))] lg:min-h-[700px] lg:px-7 lg:pt-[18px] lg:pb-4";

function CatalogPlaceholder({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-card bg-surface outline-1 -outline-offset-[0.5px] outline-line">
      {failed ? (
        <div className="flex w-full max-w-[420px] flex-col items-center gap-3">
          <Notice tone="danger" icon={TriangleAlert} title="No se pudieron cargar los productos">
            Revisá tu conexión e intentá de nuevo.
          </Notice>
          <button
            type="button"
            onClick={onRetry}
            className="flex h-10 items-center gap-1.5 rounded-[9px] px-3 text-[12px] font-bold text-brand hover:bg-brand-wash"
          >
            <RotateCw size={14} aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : (
        <p role="status" className="flex items-center gap-2 text-[13px] font-semibold text-muted">
          <LoaderCircle size={16} aria-hidden="true" className="animate-spin" />
          Cargando productos…
        </p>
      )}
    </div>
  );
}

/**
 * 07 · Productos. Container: `useProductsCatalog` owns the catalogue (pure `productsReducer`)
 * loaded from the API, and which of the three views is open: the list (07A), the editor (07B) or
 * the customer preview (07C) of the editor's draft. Saving, duplicating, archiving, restoring and
 * the availability switches go through the API and commit the product it answers. The forced
 * `?state=` variants keep the mock catalogue in memory, so the design states stay reproducible.
 */
export function ProductsScreen() {
  const forcedState = useScreenState(PRODUCTS_FORCED_STATES);
  const { state, status, retry, onAction: dispatch, changeAvailability } = useProductsCatalog(forcedState !== null, () =>
    initProductsState(forcedState),
  );
  const editorView = getEditorView(state);

  let content;
  if (status !== "ready") {
    content = (
      <div className={PAGE_CLASSES}>
        <CatalogPlaceholder failed={status === "error"} onRetry={retry} />
      </div>
    );
  } else if (state.editor && state.screen === "preview") {
    content = <CustomerPreview state={state} onAction={dispatch} />;
  } else if (state.editor && editorView && state.screen === "editor") {
    content = <ProductEditor editor={state.editor} view={editorView} onAction={dispatch} />;
  } else {
    const view = getProductsListView(state);
    content = (
      // From `lg` the list fills the viewport under the top bar, as in the 1440×900 export; below
      // it the page grows with its cards and scrolls.
      <div className={PAGE_CLASSES}>
        <ProductListHeader onCreate={() => dispatch({ type: "open-new" })} />
        <ProductListMetrics metrics={view.metrics} support={view.metricSupport} />
        <ProductListFilters
          filters={state.filters}
          categoryOptions={view.categoryOptions}
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
