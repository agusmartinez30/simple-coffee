import clsx from "clsx";
import { ClipboardPlus, LayoutGrid, List, Search } from "lucide-react";
import type { PlanSummaryItem } from "./floor-plan";
import { formatRealtimeLabel } from "./tables-view";

/** "Floorplan Header": title, subtitle, the "Live Status" pill and "Cargar pedido a mesa". */
export function TablesHeader({ syncedAt, onLoadOrder }: { syncedAt: string; onLoadOrder: () => void }) {
  return (
    <header className="flex h-[58px] w-full shrink-0 items-center justify-between">
      <div className="flex flex-col gap-[3px]">
        <h2 className="text-[26px] font-bold whitespace-nowrap text-ink">Gestión de mesas</h2>
        <p className="text-[12px] whitespace-nowrap text-muted">Vista en tiempo real del salón y la ocupación</p>
      </div>
      <div className="flex items-center gap-2.5">
        <p role="status" className="flex items-center gap-[7px] rounded-nav bg-success-bg px-2.5 py-[7px]">
          <span aria-hidden="true" className="size-[7px] rounded-full bg-success" />
          <span className="text-[11px] font-bold whitespace-nowrap text-success">{formatRealtimeLabel(syncedAt)}</span>
        </p>
        <button
          type="button"
          onClick={onLoadOrder}
          className="flex h-9 items-center gap-2 rounded-nav bg-ink px-3.5 text-[12px] font-bold whitespace-nowrap text-white hover:bg-ink/88"
        >
          <ClipboardPlus size={16} aria-hidden="true" />
          Cargar pedido a mesa
        </button>
      </div>
    </header>
  );
}

export type TablesView = "plan" | "list";

const SUMMARY_TONES: Record<PlanSummaryItem["id"], { box: string; dot: string }> = {
  available: { box: "bg-success-bg text-success", dot: "bg-success" },
  occupied: { box: "bg-brand-wash text-brand", dot: "bg-brand" },
  "bill-requested": { box: "bg-danger-bg text-danger", dot: "bg-danger" },
};

type PlanToolbarProps = {
  summary: readonly PlanSummaryItem[];
  query: string;
  onQueryChange: (query: string) => void;
  view: TablesView;
  onViewChange: (view: TablesView) => void;
};

const VIEWS: readonly { id: TablesView; label: string; icon: typeof LayoutGrid }[] = [
  { id: "plan", label: "Plano", icon: LayoutGrid },
  { id: "list", label: "Lista", icon: List },
];

/** "Floorplan Toolbar": status summary, "Buscar mesa" and the Plano / Lista switch. */
export function PlanToolbar({ summary, query, onQueryChange, view, onViewChange }: PlanToolbarProps) {
  return (
    <div className="flex h-11 w-full shrink-0 items-center justify-between gap-3">
      <ul aria-label="Resumen de mesas" className="flex items-center gap-2">
        {summary.map((item) => (
          <li key={item.id} className={clsx("flex items-center gap-1.5 rounded-nav px-2.5 py-[7px]", SUMMARY_TONES[item.id].box)}>
            <span aria-hidden="true" className={clsx("size-[7px] rounded-full", SUMMARY_TONES[item.id].dot)} />
            <span className="text-[11px] font-bold whitespace-nowrap">{item.label}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <label className="flex h-[34px] w-[170px] items-center gap-[7px] rounded-nav bg-surface px-2.5 outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:outline-brand">
          <Search size={14} aria-hidden="true" className="shrink-0 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar mesa"
            aria-label="Buscar mesa"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-muted"
          />
        </label>
        <div
          role="radiogroup"
          aria-label="Vista"
          className="flex h-[34px] items-center gap-1 rounded-nav bg-surface p-1 outline-1 -outline-offset-[0.5px] outline-line"
        >
          {VIEWS.map((option) => {
            const active = option.id === view;
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onViewChange(option.id)}
                className={clsx(
                  "flex items-center gap-[5px] rounded-[6px] px-[9px] py-[5px] text-[11px] whitespace-nowrap",
                  active ? "bg-ink font-bold text-white" : "font-semibold text-muted hover:text-ink",
                )}
              >
                {/* The export only draws the active option's icon. */}
                {active && <Icon size={13} aria-hidden="true" />}
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
