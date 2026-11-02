"use client";

import clsx from "clsx";
import { ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import type { QrSpace, TableQr } from "./table-qr-types";
import { QR_STATUS_LABELS, getQrStatus, type QrStatus, type SpaceFilter } from "./table-qr-view";

const QR_TONES: Record<QrStatus, { box: string; dot: string }> = {
  active: { box: "bg-success-bg text-success", dot: "bg-success" },
  paused: { box: "bg-sand text-muted", dot: "bg-muted" },
  missing: { box: "bg-warning-bg text-warning", dot: "bg-warning" },
};

/** 24px pill with a 6px dot: "QR activo", "QR pausado", "Sin QR". */
export function QrStatusChip({ status }: { status: QrStatus }) {
  const tone = QR_TONES[status];
  return (
    <span className={clsx("flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-xl px-2", tone.box)}>
      <span aria-hidden="true" className={clsx("size-1.5 shrink-0 rounded-full", tone.dot)} />
      <span className="text-[11px] font-bold whitespace-nowrap">{QR_STATUS_LABELS[status]}</span>
    </span>
  );
}

type TableToolbarProps = {
  query: string;
  spaces: readonly QrSpace[];
  spaceId: SpaceFilter;
  onQueryChange: (query: string) => void;
  onSpaceChange: (spaceId: SpaceFilter) => void;
};

/** Search plus the "Espacio" filter; stacks below `lg`. */
export function TableToolbar({ query, spaces, spaceId, onQueryChange, onSpaceChange }: TableToolbarProps) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-surface px-3 outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:outline-brand">
        <Search size={15} aria-hidden="true" className="shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar mesa…"
          aria-label="Buscar mesa"
          className="min-w-0 flex-1 bg-transparent text-[12px] text-ink outline-none placeholder:text-muted"
        />
      </label>
      <div className="relative h-11 w-full shrink-0 sm:w-[190px]">
        <select
          aria-label="Espacio"
          value={spaceId}
          onChange={(event) => onSpaceChange(event.target.value)}
          className="size-full cursor-pointer appearance-none rounded-[10px] bg-surface pr-9 pl-3 text-[12px] font-semibold text-ink outline-1 -outline-offset-[0.5px] outline-line focus:outline-2 focus:outline-brand"
        >
          <option value="all">Espacio: Todos</option>
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {`Espacio: ${space.name}`}
            </option>
          ))}
        </select>
        <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute top-[15px] right-3 text-ink" />
      </div>
    </div>
  );
}

type TableListProps = {
  tables: readonly TableQr[];
  /** Whether a search or filter hides tables (changes the empty copy). */
  filtered: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Extra control at the start of each row (the print selection checkbox). */
  renderLeading?: (table: TableQr) => ReactNode;
};

/** Tables by number with their space and QR status; the selected one shows in the QR panel. */
export function TableList({ tables, filtered, selectedId, onSelect, renderLeading }: TableListProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-card bg-surface outline-1 -outline-offset-[0.5px] outline-line">
      <div className="flex h-9 shrink-0 items-center gap-3 bg-sand px-3 text-[11px] font-bold text-muted">
        {renderLeading && <span className="w-5 shrink-0" aria-hidden="true" />}
        <span className="flex-1">MESA</span>
        <span className="hidden w-[130px] sm:block">ESPACIO</span>
        <span className="w-[110px]">QR</span>
      </div>
      {tables.length === 0 ? (
        <p className="px-3 py-6 text-[12px] text-muted">
          {filtered ? "No hay mesas que coincidan con la búsqueda." : "Todavía no hay mesas configuradas."}
        </p>
      ) : (
        <ul aria-label="Mesas" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {tables.map((table) => {
            const selected = table.id === selectedId;
            return (
              <li
                key={table.id}
                className={clsx(
                  "flex h-12 shrink-0 items-center gap-3 border-b border-line px-3 last:border-b-0",
                  selected ? "bg-brand-wash" : "hover:bg-cream",
                )}
              >
                {renderLeading?.(table)}
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onSelect(table.id)}
                  className="flex h-full min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  <span className={clsx("min-w-0 flex-1 truncate text-[13px] font-bold", selected ? "text-brand" : "text-ink")}>
                    {table.label}
                  </span>
                  <span className="hidden w-[130px] truncate text-[12px] text-muted sm:block">{table.spaceName}</span>
                  <span className="w-[110px]">
                    <QrStatusChip status={getQrStatus(table)} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
