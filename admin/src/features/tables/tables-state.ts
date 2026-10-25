import { deriveTable, type ServiceDay } from "@/mocks/service-day";
import type { CollectionMethod } from "@/mocks/types";
import { createChargeForm, resolveTip, type ChargeForm, type TipChoice } from "./charge-form";
import {
  addProduct,
  canAssignDraft,
  createDraft,
  removeProduct,
  setDraftNote,
  setDraftTable,
  type OrderDraft,
} from "./order-draft";
import { assignOrder, closeTable } from "./table-service";

/** Side panel of 02: none (board), "Detalle rápido" (02D) or "Cargar pedido" (02C). */
export type TablesPanel =
  | { kind: "none" }
  | { kind: "detail"; tableNumber: number }
  | { kind: "order"; draft: OrderDraft };

/** In-memory state of 02: the service day as edited in this session, the panel and the pending charge. */
export type TablesState = {
  day: ServiceDay;
  panel: TablesPanel;
  /** "Cobrar mesa" form of the table being charged: method and tip still to confirm. */
  chargeTarget: ChargeForm | null;
};

export type TablesAction =
  | { type: "select-table"; tableNumber: number }
  | { type: "close-panel" }
  | { type: "start-order"; tableNumber: number | null }
  | { type: "draft-table"; tableNumber: number | null }
  | { type: "draft-add"; productId: string }
  | { type: "draft-remove"; productId: string }
  | { type: "draft-note"; note: string }
  /** `tableNumbers`: live tables of the venue configuration, which may include tables created this session. */
  | { type: "assign-order"; customer: string; tableNumbers: readonly number[] }
  | { type: "request-charge" }
  | { type: "charge-method"; method: CollectionMethod }
  | { type: "charge-tip"; tip: TipChoice }
  | { type: "dismiss-charge" }
  | { type: "confirm-charge"; confirmedBy: string };

/**
 * `?state=` variants of the panels on Mesa 02: 02C (loading an order), 02D (its detail) and the
 * "Cobrar mesa" dialog over its detail.
 */
export type TablesPanelVariant = "load-order" | "detail" | "charge";

const VARIANT_TABLE = 2;

function initialPanel(variant: TablesPanelVariant | null): TablesPanel {
  if (variant === "detail" || variant === "charge") return { kind: "detail", tableNumber: VARIANT_TABLE };
  if (variant === "load-order") {
    return { kind: "order", draft: addProduct(addProduct(createDraft(VARIANT_TABLE), "cappuccino"), "medialuna") };
  }
  return { kind: "none" };
}

export function createTablesState(day: ServiceDay, variant: TablesPanelVariant | null = null): TablesState {
  return {
    day,
    panel: initialPanel(variant),
    chargeTarget: variant === "charge" ? createChargeForm(VARIANT_TABLE) : null,
  };
}

/** Table highlighted on the plan: the one in the detail, or the target of the order being loaded. */
export function getSelectedTableNumber(state: TablesState): number | null {
  if (state.panel.kind === "detail") return state.panel.tableNumber;
  if (state.panel.kind === "order") return state.panel.draft.tableNumber;
  return null;
}

function updateDraft(state: TablesState, update: (draft: OrderDraft) => OrderDraft): TablesState {
  return state.panel.kind === "order" ? { ...state, panel: { kind: "order", draft: update(state.panel.draft) } } : state;
}

function updateCharge(state: TablesState, update: (form: ChargeForm) => ChargeForm): TablesState {
  return state.chargeTarget ? { ...state, chargeTarget: update(state.chargeTarget) } : state;
}

/** Pure transitions of 02. Times come from the mock clock (`day.now`). */
export function tablesReducer(state: TablesState, action: TablesAction): TablesState {
  switch (action.type) {
    case "select-table":
      return { ...state, panel: { kind: "detail", tableNumber: action.tableNumber } };
    case "close-panel":
      return { ...state, panel: { kind: "none" } };
    case "start-order":
      return { ...state, panel: { kind: "order", draft: createDraft(action.tableNumber) } };
    case "draft-table":
      return updateDraft(state, (draft) => setDraftTable(draft, action.tableNumber));
    case "draft-add":
      return updateDraft(state, (draft) => addProduct(draft, action.productId));
    case "draft-remove":
      return updateDraft(state, (draft) => removeProduct(draft, action.productId));
    case "draft-note":
      return updateDraft(state, (draft) => setDraftNote(draft, action.note));
    case "assign-order": {
      if (state.panel.kind !== "order" || !canAssignDraft(state.panel.draft)) return state;
      const { tableNumber, lines, note } = state.panel.draft;
      if (tableNumber === null) return state;
      // Assign against the live venue tables, then keep the seed list of the day as it was.
      const live = { ...state.day, tableNumbers: [...action.tableNumbers] };
      const next = assignOrder(live, { tableNumber, lines, note, customer: action.customer, at: state.day.now });
      if (next === live) return state;
      return {
        ...state,
        day: { ...next, tableNumbers: state.day.tableNumbers },
        panel: { kind: "detail", tableNumber },
      };
    }
    case "request-charge": {
      if (state.panel.kind !== "detail") return state;
      const seated = deriveTable(state.day, state.panel.tableNumber).status !== "available";
      return seated ? { ...state, chargeTarget: createChargeForm(state.panel.tableNumber) } : state;
    }
    case "charge-method":
      return updateCharge(state, (form) => ({ ...form, method: action.method }));
    case "charge-tip":
      return updateCharge(state, (form) => ({ ...form, tip: action.tip }));
    case "dismiss-charge":
      return { ...state, chargeTarget: null };
    case "confirm-charge": {
      const form = state.chargeTarget;
      if (!form) return state;
      const total = deriveTable(state.day, form.tableNumber).accountTotal;
      const tip = resolveTip(form.tip, total);
      // Same guard as `canConfirmCharge`: a chosen method and a valid tip.
      if (form.method === null || tip === null) return state;
      return {
        day: closeTable(state.day, {
          tableNumber: form.tableNumber,
          at: state.day.now,
          confirmedBy: action.confirmedBy,
          method: form.method,
          tip,
        }),
        panel: { kind: "none" },
        chargeTarget: null,
      };
    }
  }
}
