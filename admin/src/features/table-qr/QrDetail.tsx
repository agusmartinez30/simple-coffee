"use client";

import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Download, LoaderCircle, RefreshCw, type LucideIcon } from "lucide-react";
import { QrCode } from "./QrCode";
import { formatDisplayUrl } from "./qr-url";
import type { TableQr } from "./table-qr-types";
import { getCredentialHistory, getQrStatus } from "./table-qr-view";
import { QrStatusChip } from "./TableList";

export type DownloadFormat = "png" | "svg";

type ActionButtonProps = { label: string; icon: LucideIcon; onClick: () => void; ariaLabel?: string };

/** 38px outlined action ("PNG", "SVG", "Imprimir tarjeta"). */
export function ActionButton({ label, icon: Icon, onClick, ariaLabel }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-nav bg-surface px-3 text-brand outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream"
    >
      <Icon size={13} aria-hidden="true" className="shrink-0" />
      <span className="text-[11px] font-bold whitespace-nowrap">{label}</span>
    </button>
  );
}

type QrDetailProps = {
  table: TableQr;
  /** URL the code encodes; null when the table has no credential. */
  url: string | null;
  now: Date;
  /** The API is rotating this table's token. */
  pending: boolean;
  onCopy: () => Promise<boolean>;
  onDownload: (format: DownloadFormat) => void;
  onRegenerate: () => void;
  /** Extra actions under the downloads (printing). */
  extraActions?: ReactNode;
};

/**
 * QR panel of the selected table: the real code, its public URL (copy), PNG / SVG downloads,
 * "Regenerar código QR" and the credential history.
 */
export function QrDetail({ table, url, now, pending, onCopy, onDownload, onRegenerate, extraActions }: QrDetailProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const status = getQrStatus(table);
  const history = getCredentialHistory(table, now);

  return (
    <aside
      aria-labelledby="qr-detail-title"
      className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto rounded-card bg-surface p-5 outline-1 -outline-offset-[0.5px] outline-line lg:h-full lg:w-[420px]"
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <h3 id="qr-detail-title" className="truncate text-[19px] font-bold text-ink">
            {table.label}
          </h3>
          <p className="text-[12px] text-muted">{table.spaceName || "Sin espacio"}</p>
        </div>
        <QrStatusChip status={status} />
      </div>

      <div className="flex w-full shrink-0 flex-col items-center gap-3 rounded-[16px] bg-surface p-4 outline-1 -outline-offset-[0.5px] outline-line">
        <div
          className={clsx(
            "flex size-[236px] shrink-0 items-center justify-center rounded-[4px] bg-white outline-1 -outline-offset-[0.5px] outline-ink",
            pending && "opacity-40",
          )}
        >
          {url ? (
            <QrCode value={url} size={196} label={`Código QR de ${table.label}`} className="text-ink" />
          ) : (
            <p className="px-6 text-center text-[12px] text-muted">Esta mesa todavía no tiene código QR.</p>
          )}
        </div>
        <p className="text-center text-[11px]/[14px] text-muted">
          {status === "paused" ? "Mesa deshabilitada · el código no abre la carta" : "Escaneable con la cámara del celular"}
        </p>
      </div>

      {url && (
        <div className="flex h-[52px] w-full shrink-0 items-center justify-between gap-3 rounded-[9px] bg-cream px-3">
          <p className="min-w-0 truncate text-[12px] font-semibold text-ink" title={url}>
            {formatDisplayUrl(url)}
          </p>
          <button
            type="button"
            aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
            title={copied ? "Enlace copiado" : "Copiar enlace"}
            onClick={async () => setCopied(await onCopy())}
            className={clsx(
              "flex size-8 shrink-0 items-center justify-center rounded-nav hover:bg-surface",
              copied ? "text-success" : "text-ink",
            )}
          >
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
          </button>
        </div>
      )}

      {url && (
        <div className="flex w-full shrink-0 gap-2">
          <ActionButton label="PNG" ariaLabel="Descargar PNG" icon={Download} onClick={() => onDownload("png")} />
          <ActionButton label="SVG" ariaLabel="Descargar SVG" icon={Download} onClick={() => onDownload("svg")} />
        </div>
      )}
      {extraActions}

      <button
        type="button"
        onClick={onRegenerate}
        disabled={pending}
        aria-haspopup="dialog"
        className="flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-[9px] bg-danger-bg text-[12px] font-bold text-danger hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle size={14} aria-hidden="true" className="animate-spin" />
        ) : (
          <RefreshCw size={14} aria-hidden="true" />
        )}
        {pending ? "Regenerando…" : url ? "Regenerar código QR" : "Generar código QR"}
      </button>

      {history.length > 0 && (
        <>
          <h4 className="text-[11px] font-bold tracking-[0.6px] text-muted">HISTORIAL DE CREDENCIALES</h4>
          <ul className="flex w-full flex-col">
            {history.map((row) => (
              <li key={row.key} className="flex h-[38px] shrink-0 items-center justify-between gap-3 border-b border-line">
                <span className={clsx("text-[11px] font-bold", row.status === "active" ? "text-success" : "text-muted")}>
                  {row.label}
                </span>
                <span className="truncate text-[11px] text-muted">{row.meta}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
