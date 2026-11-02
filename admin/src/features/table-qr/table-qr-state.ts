import type { TableQr, TablesQrConfig } from "./table-qr-types";
import type { SpaceFilter, TableFilters } from "./table-qr-view";

/**
 * State of the "QR de mesas" screen: the configuration the API answered, which table the QR
 * panel shows, the list filters, the regenerate confirmation and the last notice.
 */
export type TableQrState = {
  /** `failed` only while nothing loaded yet; later refresh failures keep the tables with a notice. */
  load: "loading" | "ready" | "failed";
  config: TablesQrConfig;
  selectedId: string | null;
  filters: TableFilters;
  /** "¿Regenerar código QR?" is open for the selected table. */
  confirmingRegenerate: boolean;
  /** Table whose rotation the API is processing. */
  pendingId: string | null;
  notice: string | null;
  noticeTone: "success" | "danger";
};

export type TableQrAction =
  | { type: "loaded"; config: TablesQrConfig }
  | { type: "load-failed"; message: string }
  | { type: "retry" }
  | { type: "select"; id: string }
  | { type: "set-query"; query: string }
  | { type: "set-space"; spaceId: SpaceFilter }
  | { type: "open-regenerate" }
  | { type: "cancel-regenerate" }
  | { type: "regenerate-started"; id: string }
  | { type: "regenerate-succeeded"; config: TablesQrConfig; message: string }
  /** `message` is null when nothing should show (a lost session redirects to /login). */
  | { type: "regenerate-failed"; message: string | null }
  | { type: "dismiss-notice" };

export function createTableQrState(): TableQrState {
  return {
    load: "loading",
    config: { spaces: [], tables: [] },
    selectedId: null,
    filters: { query: "", spaceId: "all" },
    confirmingRegenerate: false,
    pendingId: null,
    notice: null,
    noticeTone: "danger",
  };
}

/** Keeps the selected table when it still exists, otherwise the first one. */
function keepSelection(config: TablesQrConfig, selectedId: string | null): string | null {
  if (selectedId !== null && config.tables.some((table) => table.id === selectedId)) return selectedId;
  return config.tables[0]?.id ?? null;
}

export function tableQrReducer(state: TableQrState, action: TableQrAction): TableQrState {
  switch (action.type) {
    case "loaded":
      return { ...state, load: "ready", config: action.config, selectedId: keepSelection(action.config, state.selectedId) };
    case "load-failed":
      return state.load === "ready"
        ? { ...state, notice: action.message, noticeTone: "danger" }
        : { ...state, load: "failed" };
    case "retry":
      return { ...state, load: state.load === "failed" ? "loading" : state.load };
    case "select":
      return { ...state, selectedId: action.id, confirmingRegenerate: false };
    case "set-query":
      return { ...state, filters: { ...state.filters, query: action.query } };
    case "set-space":
      return { ...state, filters: { ...state.filters, spaceId: action.spaceId } };
    case "open-regenerate":
      return state.selectedId === null || state.pendingId !== null ? state : { ...state, confirmingRegenerate: true };
    case "cancel-regenerate":
      return { ...state, confirmingRegenerate: false };
    case "regenerate-started":
      return { ...state, confirmingRegenerate: false, pendingId: action.id, notice: null };
    case "regenerate-succeeded":
      return {
        ...state,
        config: action.config,
        selectedId: keepSelection(action.config, state.selectedId),
        pendingId: null,
        notice: action.message,
        noticeTone: "success",
      };
    case "regenerate-failed":
      return { ...state, pendingId: null, notice: action.message, noticeTone: "danger" };
    case "dismiss-notice":
      return { ...state, notice: null };
  }
}

export function getSelectedTable(state: TableQrState): TableQr | null {
  return state.config.tables.find((table) => table.id === state.selectedId) ?? null;
}
