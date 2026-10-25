"use client";

import { useMemo, useReducer, useState } from "react";
import clsx from "clsx";
import { Armchair } from "lucide-react";
import { SERVICE_DAY } from "@/mocks/service-day";
import { DEMO_STAFF } from "@/mocks/staff";
import { useScreenState } from "@/shared/lib/use-screen-state";
import { useVenue } from "@/features/venue/venue-store";
import { getChargeView } from "./charge-form";
import { ChargeTableDialog } from "./ChargeTableDialog";
import { FloorPlan } from "./FloorPlan";
import { getLiveTables, getPlanSummary, getSpacePlan, getSpaceTabs, type PlanTransform } from "./floor-plan";
import {
  canAssignDraft,
  getAssignLabel,
  getDraftSummary,
  getQuickProducts,
  getTableOptions,
  type ProductShortcut,
} from "./order-draft";
import { OrderPanel } from "./OrderPanel";
import { getTableDetail } from "./table-detail";
import { TableBoard } from "./TableBoard";
import { TableDetailPanel } from "./TableDetailPanel";
import { PlanToolbar, TablesHeader, type TablesView } from "./TablesHeader";
import { createTablesState, getSelectedTableNumber, tablesReducer } from "./tables-state";
import { filterTables } from "./tables-view";

/**
 * Forced variants: `empty` (no tables configured yet), `no-results` (search with no match),
 * `list` (the "Lista" view), `terraza` (the Terraza plan), `load-order` (02C: loading an order to
 * Mesa 02), `detail` (02D: Mesa 02's quick detail) and `charge` ("Cobrar Mesa 02" over its detail).
 * The 02 export is the plan of Salón with no table selected.
 */
export const TABLES_FORCED_STATES = ["empty", "no-results", "list", "terraza", "load-order", "detail", "charge"] as const;

/** Query that `?state=no-results` pre-fills: no table has that number. */
const NO_RESULTS_QUERY = "Mesa 99";

const DEFAULT_TRANSFORM: PlanTransform = { scale: 1, x: 0, y: 0 };

/**
 * 02 · Mesas (live operation). Container: owns the in-memory service day (orders loaded and tables
 * charged in this session), the open panel, the active space, view, search and zoom. Spaces, layout
 * and capacities come from the shared venue store (configured in Gestión de mesas); the live state
 * (status, account, time seated, kitchen) is derived from the service day.
 */
export function TablesScreen() {
  const forcedState = useScreenState(TABLES_FORCED_STATES);
  const venue = useVenue();
  const { spaces } = venue;
  const [state, dispatch] = useReducer(tablesReducer, forcedState, (forced) =>
    createTablesState(SERVICE_DAY, forced === "load-order" || forced === "detail" || forced === "charge" ? forced : null),
  );
  const config = useMemo(() => (forcedState === "empty" ? [] : venue.tables), [forcedState, venue.tables]);
  const live = useMemo(() => getLiveTables(config, state.day), [config, state.day]);

  const [spaceId, setSpaceId] = useState(() => (forcedState === "terraza" ? "terraza" : (spaces[0]?.id ?? "")));
  const [view, setView] = useState<TablesView>(() => (forcedState === "list" ? "list" : "plan"));
  const [query, setQuery] = useState(() => (forcedState === "no-results" ? NO_RESULTS_QUERY : ""));
  const [transform, setTransform] = useState(DEFAULT_TRANSFORM);
  const [shortcut, setShortcut] = useState<ProductShortcut>("frequent");
  const [productQuery, setProductQuery] = useState("");

  const selectedNumber = getSelectedTableNumber(state);
  const selectedId = live.find((table) => table.number === selectedNumber)?.id ?? null;
  const plan = getSpacePlan(spaceId, config, live, query);
  const matches = filterTables(live, { filter: "all", query });
  const spaceName = spaces.find((space) => space.id === spaceId)?.name ?? "";
  const clearSearch = () => setQuery("");
  const selectTable = (id: string) => {
    const number = live.find((table) => table.id === id)?.number;
    if (number !== undefined) dispatch({ type: "select-table", tableNumber: number });
  };
  const startOrder = (tableNumber: number | null) => {
    setShortcut("frequent");
    setProductQuery("");
    dispatch({ type: "start-order", tableNumber });
  };

  const planNotice =
    live.length === 0
      ? { title: "Todavía no hay mesas habilitadas" }
      : matches.length === 0
        ? { title: "No encontramos mesas", action: { label: "Limpiar búsqueda", onClick: clearSearch } }
        : plan.length === 0
          ? { title: `No hay mesas en ${spaceName}` }
          : null;

  const { panel } = state;
  const detail = panel.kind === "detail" ? getTableDetail(state.day, panel.tableNumber) : null;
  const charge = state.chargeTarget;

  return (
    // The open panel keeps the export's column: 900px beside the quick detail, 820px beside "Cargar pedido".
    <div
      className={clsx(
        "flex h-[calc(100dvh-72px)] min-h-[760px] flex-col gap-3.5 px-6 pt-5 pb-4",
        panel.kind === "order" ? "w-[820px]" : panel.kind === "detail" ? "w-[900px]" : "w-full",
      )}
    >
      <TablesHeader syncedAt={state.day.syncedAt} onLoadOrder={() => startOrder(selectedNumber)} />
      <PlanToolbar
        summary={getPlanSummary(live)}
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={(next) => {
          // Back on the plan, show the space of the selected table.
          const space = config.find((table) => table.number === selectedNumber)?.spaceId;
          if (next === "plan" && space && space !== spaceId) {
            setSpaceId(space);
            setTransform(DEFAULT_TRANSFORM);
          }
          setView(next);
        }}
      />
      {view === "plan" ? (
        <FloorPlan
          spaceName={spaceName}
          tables={plan}
          tabs={getSpaceTabs(spaces, config)}
          activeSpaceId={spaceId}
          selectedId={selectedId}
          transform={transform}
          notice={planNotice}
          onSelect={selectTable}
          onSpaceChange={(id) => {
            setSpaceId(id);
            setTransform(DEFAULT_TRANSFORM);
          }}
          onTransformChange={setTransform}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <TableBoard
            tables={matches}
            view="list"
            selectedId={selectedId}
            onSelect={selectTable}
            emptyState={
              live.length === 0
                ? {
                    icon: Armchair,
                    title: "Todavía no hay mesas habilitadas",
                    description: "Cuando habilites mesas desde Gestión de mesas, vas a verlas acá.",
                  }
                : {
                    title: "No encontramos mesas",
                    description: "Probá con otro número de mesa.",
                    action: { label: "Limpiar búsqueda", onClick: clearSearch },
                  }
            }
          />
        </div>
      )}
      {detail && (
        <TableDetailPanel
          detail={detail}
          onClose={() => dispatch({ type: "close-panel" })}
          onLoadOrder={() => startOrder(detail.number)}
          onCharge={() => dispatch({ type: "request-charge" })}
        />
      )}
      {panel.kind === "order" && (
        <OrderPanel
          draft={panel.draft}
          summary={getDraftSummary(panel.draft, state.day.products)}
          tableOptions={getTableOptions(config)}
          products={getQuickProducts(state.day, { shortcut, query: productQuery })}
          shortcut={shortcut}
          query={productQuery}
          canAssign={canAssignDraft(panel.draft)}
          assignLabel={getAssignLabel(panel.draft)}
          onClose={() => dispatch({ type: "close-panel" })}
          onTableChange={(tableNumber) => dispatch({ type: "draft-table", tableNumber })}
          onShortcutChange={(next) => {
            setShortcut(next);
            setProductQuery("");
          }}
          onQueryChange={setProductQuery}
          onAdd={(productId) => dispatch({ type: "draft-add", productId })}
          onRemove={(productId) => dispatch({ type: "draft-remove", productId })}
          onNoteChange={(note) => dispatch({ type: "draft-note", note })}
          onAssign={() =>
            dispatch({ type: "assign-order", customer: DEMO_STAFF.name, tableNumbers: live.map((table) => table.number) })
          }
        />
      )}
      {charge && (
        <ChargeTableDialog
          view={getChargeView(state.day, charge)}
          method={charge.method}
          tip={charge.tip}
          onMethodChange={(method) => dispatch({ type: "charge-method", method })}
          onTipChange={(tip) => dispatch({ type: "charge-tip", tip })}
          onCancel={() => dispatch({ type: "dismiss-charge" })}
          onConfirm={() => dispatch({ type: "confirm-charge", confirmedBy: DEMO_STAFF.name })}
        />
      )}
    </div>
  );
}
