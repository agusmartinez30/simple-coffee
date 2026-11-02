"use client";

import { useMemo, useState } from "react";
import { CircleCheck, LoaderCircle, QrCode as QrCodeIcon, RotateCw, TriangleAlert, X } from "lucide-react";
import { Notice } from "@/shared/ui";
import { getQrFileName } from "./qr-file-name";
import { copyText, downloadPng, downloadSvg } from "./qr-download";
import { buildQrSvgMarkup } from "./qr-matrix";
import { buildTableQrUrl } from "./qr-url";
import { QrDetail, type DownloadFormat } from "./QrDetail";
import { RegenerateDialog } from "./RegenerateDialog";
import { getSelectedTable } from "./table-qr-state";
import type { TableQr } from "./table-qr-types";
import { filterTables } from "./table-qr-view";
import { TableList, TableToolbar } from "./TableList";
import { useTableQr } from "./use-table-qr";

/** PNG exports are rasterized at 1024px. */
const QR_PNG_WIDTH = 1024;

const tableUrl = (table: TableQr) => (table.qr ? buildTableQrUrl({ number: table.number, token: table.qr.token }) : null);

function ScreenPlaceholder({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-card bg-surface outline-1 -outline-offset-[0.5px] outline-line">
      {failed ? (
        <div className="flex w-full max-w-[420px] flex-col items-center gap-3 px-4">
          <Notice tone="danger" icon={TriangleAlert} title="No pudimos cargar las mesas">
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
          Cargando mesas…
        </p>
      )}
    </div>
  );
}

function EmptyTables() {
  return (
    <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center gap-2 rounded-card bg-surface px-4 text-center outline-1 -outline-offset-[0.5px] outline-line">
      <QrCodeIcon size={28} aria-hidden="true" className="text-muted" />
      <p className="text-[14px] font-bold text-ink">Todavía no hay mesas</p>
      <p className="text-[12px] text-muted">Cuando el local tenga mesas configuradas, vas a ver sus códigos QR acá.</p>
    </div>
  );
}

/**
 * QR de mesas. Container: `useTableQr` owns the tables from the API and the token rotation; this
 * screen derives the filtered list and the selected table's URL, and handles copy and downloads.
 * Table and space configuration live elsewhere: this module only shows, exports and rotates codes.
 */
export function TableQrScreen() {
  const { state, dispatch, retry, confirmRegenerate } = useTableQr();
  const [now] = useState(() => new Date());
  const selected = getSelectedTable(state);
  const visibleTables = useMemo(() => filterTables(state.config.tables, state.filters), [state.config.tables, state.filters]);

  const downloadQr = (table: TableQr, format: DownloadFormat) => {
    const url = tableUrl(table);
    if (!url) return;
    const svg = buildQrSvgMarkup(url);
    const fileName = getQrFileName(table.label, "qr", format);
    if (format === "svg") downloadSvg(svg, fileName);
    else void downloadPng(svg, fileName, QR_PNG_WIDTH);
  };

  let body;
  if (state.load !== "ready") {
    body = <ScreenPlaceholder failed={state.load === "failed"} onRetry={retry} />;
  } else if (state.config.tables.length === 0) {
    body = <EmptyTables />;
  } else {
    const selectedUrl = selected ? tableUrl(selected) : null;
    body = (
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 lg:flex-row">
        <div className="flex min-h-[320px] min-w-0 flex-1 flex-col gap-3">
          <TableToolbar
            query={state.filters.query}
            spaces={state.config.spaces}
            spaceId={state.filters.spaceId}
            onQueryChange={(query) => dispatch({ type: "set-query", query })}
            onSpaceChange={(spaceId) => dispatch({ type: "set-space", spaceId })}
          />
          <TableList
            tables={visibleTables}
            filtered={visibleTables.length < state.config.tables.length}
            selectedId={state.selectedId}
            onSelect={(id) => dispatch({ type: "select", id })}
          />
        </div>
        {selected && (
          <QrDetail
            table={selected}
            url={selectedUrl}
            now={now}
            pending={state.pendingId === selected.id}
            onCopy={() => (selectedUrl ? copyText(selectedUrl) : Promise.resolve(false))}
            onDownload={(format) => downloadQr(selected, format)}
            onRegenerate={() => dispatch({ type: "open-regenerate" })}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-var(--topbar-h))] flex-col gap-3 px-4 pt-4 pb-6 lg:h-[calc(100dvh-var(--topbar-h))] lg:min-h-[640px] lg:px-7 lg:pt-[22px] lg:pb-7">
      <header className="flex w-full shrink-0 flex-col gap-[3px]">
        <h2 className="text-[20px] leading-tight font-extrabold text-ink lg:text-[24px]">QR de mesas</h2>
        <p className="text-[12px] text-muted">Descargá, imprimí o regenerá el código QR de cada mesa.</p>
      </header>
      {state.notice && (
        <div className="flex w-full items-center gap-2">
          <Notice
            tone={state.noticeTone}
            icon={state.noticeTone === "success" ? CircleCheck : TriangleAlert}
            className="flex-1"
          >
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
      {body}
      {state.confirmingRegenerate && selected && (
        <RegenerateDialog
          label={selected.label}
          onCancel={() => dispatch({ type: "cancel-regenerate" })}
          onConfirm={confirmRegenerate}
        />
      )}
    </div>
  );
}
