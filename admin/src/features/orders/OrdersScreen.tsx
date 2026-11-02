"use client";

import { useMemo, useState } from "react";
import { ClipboardList, LoaderCircle, RotateCw, TriangleAlert, X } from "lucide-react";
import { Notice } from "@/shared/ui";
import { useIsDesktop } from "@/shared/lib/use-media-query";
import { useScreenState } from "@/shared/lib/use-screen-state";
import { pickActiveTab } from "./board-tabs";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { KanbanBoard, type BoardEmptyState } from "./KanbanBoard";
import { OrderDetailPanel } from "./OrderDetailPanel";
import { OrderToolbar } from "./OrderToolbar";
import { OrderMetrics, OrdersHeader } from "./OrdersHeader";
import { NewOrderPanel } from "./order-entry/NewOrderPanel";
import type { Order } from "./order-types";
import {
  countQuickFilters,
  filterBoardOrders,
  getAlertMetrics,
  keepRecentDelivered,
  sortNewestFirst,
  type QuickFilter,
} from "./order-alerts";
import { getCancelTarget, getSelectedOrder } from "./orders-state";
import { groupOrdersByColumn, type OrderColumnId } from "./orders-view";
import { useOrdersBoard } from "./use-orders-board";

/**
 * Forced variants: `empty` (no orders yet, without calling the API) and `no-results` (search with
 * no match). Without a variant the panel opens on the oldest delayed order of the first load.
 */
export const ORDERS_FORCED_STATES = ["empty", "no-results"] as const;

/** Query that `?state=no-results` pre-fills: no order has that number. */
const NO_RESULTS_QUERY = "9999";

function BoardPlaceholder({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-card bg-surface outline-1 -outline-offset-[0.5px] outline-line">
      {failed ? (
        <div className="flex w-full max-w-[420px] flex-col items-center gap-3">
          <Notice tone="danger" icon={TriangleAlert} title="No pudimos cargar los pedidos">
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
          Cargando pedidos…
        </p>
      )}
    </div>
  );
}

/**
 * 03 · Gestión de pedidos (propuesta optimizada). Container: `useOrdersBoard` owns the day's
 * orders from the API (polling, advance, two-step cancellation); this screen owns search, quick
 * filter, toggles and whether "Nuevo pedido" is open. A created order joins the board selected.
 * Below `lg` it also owns the status tab on screen; there no order opens by default, since the
 * detail is a sheet over the board.
 */
export function OrdersScreen() {
  const forcedState = useScreenState(ORDERS_FORCED_STATES);
  const isDesktop = useIsDesktop();
  const { state, now, dispatch, refresh, advance, confirmCancel } = useOrdersBoard({
    offline: forcedState === "empty",
    autoSelect: isDesktop,
  });
  const selectedOrder = getSelectedOrder(state);
  const cancelTarget = getCancelTarget(state);
  const [query, setQuery] = useState(() => (forcedState === "no-results" ? NO_RESULTS_QUERY : ""));
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [showDelivered, setShowDelivered] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [entryOpen, setEntryOpen] = useState(false);
  const [chosenTab, setChosenTab] = useState<OrderColumnId | null>(null);
  const offline = forcedState === "empty";

  const handleCreated = (order: Order) => {
    setEntryOpen(false);
    dispatch({ type: "created", order });
  };

  const orders = useMemo(() => keepRecentDelivered(state.orders, now), [state.orders, now]);
  const visibleOrders = useMemo(
    () => filterBoardOrders(orders, { query, quickFilter, showDelivered, now }),
    [orders, query, quickFilter, showDelivered, now],
  );
  const columns = groupOrdersByColumn(sortNewestFirst(visibleOrders), { showDelivered });
  const activeColumnId = pickActiveTab(columns, chosenTab);

  const clearFilters = () => {
    setQuery("");
    setQuickFilter("all");
    setShowDelivered(true);
  };

  let emptyState: BoardEmptyState | null = null;
  if (visibleOrders.length === 0) {
    emptyState = orders.some((order) => order.status !== "cancelled")
      ? {
          title: "No encontramos pedidos",
          description: "Probá con otro pedido, mesa o cliente, o mostrá todos los pedidos.",
          action: { label: "Limpiar búsqueda y filtros", onClick: clearFilters },
        }
      : {
          icon: ClipboardList,
          title: "Todavía no hay pedidos",
          description: "Cuando las mesas confirmen pedidos, vas a verlos acá.",
        };
  }

  return (
    // From `lg` the board and the panel fill the viewport under the 72px top bar and columns scroll
    // on their own; below it the page scrolls and the single column grows with its cards.
    <div className="flex min-h-[calc(100dvh-var(--topbar-h))] flex-col gap-3 px-4 pt-4 pb-6 lg:h-[calc(100dvh-var(--topbar-h))] lg:min-h-[640px] lg:px-7 lg:pt-[22px] lg:pb-7">
      <OrdersHeader
        enabled={alertsEnabled}
        onToggle={() => setAlertsEnabled((enabled) => !enabled)}
        onNewOrder={offline ? undefined : () => setEntryOpen(true)}
      />
      <OrderMetrics metrics={getAlertMetrics(orders, now)} />
      <OrderToolbar
        query={query}
        onQueryChange={setQuery}
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        delayedCount={countQuickFilters(orders, now).delayed}
        showDelivered={showDelivered}
        onShowDeliveredChange={setShowDelivered}
      />
      {state.notice && (
        <div className="flex w-full items-center gap-2">
          <Notice tone="danger" icon={TriangleAlert} className="flex-1">
            {state.notice}
          </Notice>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => dispatch({ type: "dismiss-notice" })}
            className="flex size-8 shrink-0 items-center justify-center rounded-nav text-muted hover:bg-cream"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}
      {state.load === "ready" ? (
        <div className="flex min-h-0 w-full flex-1 gap-3">
          <KanbanBoard
            columns={columns}
            emptyState={emptyState}
            activeColumnId={activeColumnId}
            onActiveColumnChange={setChosenTab}
            now={now}
            selectedId={state.selectedId}
            pendingIds={state.pendingIds}
            onSelect={(id) => dispatch({ type: "open-detail", id })}
            onAdvance={advance}
          />
          <OrderDetailPanel
            layout={isDesktop ? "panel" : "sheet"}
            order={selectedOrder}
            now={now}
            pending={selectedOrder !== null && state.pendingIds.includes(selectedOrder.id)}
            onClose={() => dispatch({ type: "close-detail" })}
            onAdvance={advance}
            onRequestCancel={(id) => dispatch({ type: "request-cancel", id })}
          />
        </div>
      ) : (
        <BoardPlaceholder failed={state.load === "failed"} onRetry={() => void refresh()} />
      )}
      {cancelTarget && (
        <CancelOrderDialog
          key={cancelTarget.id}
          order={cancelTarget}
          pending={state.pendingIds.includes(cancelTarget.id)}
          onDismiss={() => dispatch({ type: "dismiss-cancel" })}
          onConfirm={confirmCancel}
        />
      )}
      {entryOpen && <NewOrderPanel onClose={() => setEntryOpen(false)} onCreated={handleCreated} />}
    </div>
  );
}
