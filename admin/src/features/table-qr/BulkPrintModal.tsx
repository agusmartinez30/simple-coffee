"use client";

import { useId } from "react";
import { ChevronDown, Square, SquareCheck } from "lucide-react";
import { Modal } from "@/shared/ui";
import {
  PRINT_SIZES,
  setBulkSpace,
  toggleAll,
  toggleSelection,
  type BulkPrintState,
  type BulkPrintView,
  type PrintSizeId,
} from "./print-selection";
import { QrCode } from "./QrCode";
import type { QrSpace, TableQr } from "./table-qr-types";

type BulkSelectProps<T extends string> = {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
};

/** "Espacio" / "Tamaño": cream select whose options carry the filter name. */
function BulkSelect<T extends string>({ label, value, options, onChange }: BulkSelectProps<T>) {
  return (
    <div className="relative h-[38px] min-w-0 flex-1">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="size-full cursor-pointer appearance-none rounded-nav bg-cream pr-8 pl-2.5 text-[11px] font-semibold text-ink outline-none focus:outline-2 focus:outline-brand"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {`${label}: ${option.label}`}
          </option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden="true" className="pointer-events-none absolute top-3 right-2.5 text-muted" />
    </div>
  );
}

type BulkPrintModalProps = {
  tables: readonly TableQr[];
  spaces: readonly QrSpace[];
  bulk: BulkPrintState;
  view: BulkPrintView;
  onChange: (bulk: BulkPrintState) => void;
  onClose: () => void;
  /** Opens the browser's print dialog with every sheet ("Guardar como PDF" exports them). */
  onPrint: () => void;
};

/**
 * "Imprimir códigos QR": selection count, "Seleccionar todos", space and card size, the table
 * checklist, the A4 preview of the first sheet and "Imprimir". Only enabled tables with an
 * active QR are listed.
 */
export function BulkPrintModal({ tables, spaces, bulk, view, onChange, onClose, onPrint }: BulkPrintModalProps) {
  const titleId = useId();
  const spaceOptions = [{ id: "all", label: "Todos" }, ...spaces.map((space) => ({ id: space.id, label: space.name }))];

  return (
    <Modal labelledBy={titleId} onClose={onClose} className="w-[760px]">
      <div className="flex w-full flex-col gap-3">
        <div className="flex w-full items-center gap-3 pr-10">
          <h2 id={titleId} className="text-[18px] font-bold text-ink">
            Imprimir códigos QR
          </h2>
          <p role="status" className="text-[12px] font-bold text-brand">
            {view.countLabel}
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            aria-pressed={view.allSelected}
            onClick={() => onChange({ ...bulk, selection: toggleAll(view.visible, bulk.selection) })}
            className="flex h-[38px] min-w-0 flex-1 items-center rounded-nav bg-cream px-2.5 text-left text-[11px] font-semibold text-ink hover:bg-sand"
          >
            {view.allSelected ? "✓ Seleccionar todos" : "Seleccionar todos"}
          </button>
          <BulkSelect
            label="Espacio"
            value={bulk.spaceId}
            options={spaceOptions}
            onChange={(spaceId) => onChange(setBulkSpace(bulk, tables, spaceId))}
          />
          <BulkSelect<PrintSizeId>
            label="Tamaño"
            value={bulk.size}
            options={PRINT_SIZES}
            onChange={(size) => onChange({ ...bulk, size })}
          />
        </div>

        <div className="flex w-full flex-col gap-3.5 sm:h-[320px] sm:flex-row">
          <ul aria-label="Mesas a imprimir" className="flex max-h-[240px] min-h-0 min-w-0 flex-1 flex-col gap-[5px] overflow-y-auto sm:max-h-none">
            {view.rows.length === 0 && (
              <li className="py-6 text-center text-[12px] text-muted">No hay mesas con un código QR activo.</li>
            )}
            {view.rows.map((row) => (
              <li key={row.id} className="flex h-[30px] shrink-0">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={row.selected}
                  onClick={() => onChange({ ...bulk, selection: toggleSelection(bulk.selection, row.id) })}
                  className="flex w-full items-center gap-2 rounded-[7px] bg-cream px-[9px] text-left hover:bg-sand"
                >
                  {row.selected ? (
                    <SquareCheck size={14} aria-hidden="true" className="shrink-0 text-brand" />
                  ) : (
                    <Square size={14} aria-hidden="true" className="shrink-0 text-muted" />
                  )}
                  <span className="truncate text-[11px] text-ink">{row.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex h-full w-full shrink-0 flex-col gap-[7px] rounded-[9px] bg-cream p-3 sm:w-[310px]">
            <p className="flex justify-between text-[11px] font-bold text-muted">
              <span>VISTA PREVIA · A4</span>
              {view.sheets.length > 1 && <span className="font-semibold">{`${view.sheets.length} hojas`}</span>}
            </p>
            {view.preview.length === 0 && (
              <p className="py-6 text-center text-[12px] text-muted">Seleccioná al menos una mesa.</p>
            )}
            {view.preview.map((card) => (
              <div
                key={card.tableId}
                className="flex min-h-[40px] w-full flex-1 items-center justify-between overflow-hidden bg-surface px-2.5 outline-1 -outline-offset-[0.5px] outline-line"
              >
                <span className="text-[11px] font-bold text-ink">{card.title}</span>
                <QrCode value={card.url} size={view.perSheet > 4 ? 30 : 34} label={`Código QR de ${card.label}`} className="text-ink" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted">Solo se incluyen mesas habilitadas con un código QR activo.</p>
          <button
            type="button"
            disabled={!view.canExport}
            onClick={onPrint}
            className="flex h-[38px] items-center justify-center rounded-[9px] bg-brand px-[13px] text-[12px] font-bold text-white hover:bg-brand/92 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Imprimir o guardar PDF
          </button>
        </div>
      </div>
    </Modal>
  );
}
