"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ShieldCheck, TriangleAlert } from "lucide-react";
import { formatOrderLocation } from "./order-alerts";
import type { CancellationReason, Order } from "./order-types";
import { CANCELLATION_REASONS } from "./orders-view";

type CancelOrderDialogProps = {
  order: Order;
  /** The cancellation is in flight: confirming again is disabled until the API answers. */
  pending?: boolean;
  onDismiss: () => void;
  onConfirm: (reason: CancellationReason) => void;
};

/**
 * "Cancellation Confirmation · #NNNN": modal over the whole screen. Nothing changes until
 * "Confirmar cancelación" and the API answers; "Volver", Escape or the backdrop dismiss it.
 */
export function CancelOrderDialog({ order, pending = false, onDismiss, onConfirm }: CancelOrderDialogProps) {
  const [reason, setReason] = useState<CancellationReason>(CANCELLATION_REASONS[0].id);
  const backRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    // From `lg` the 03 dialog sits 240px from the top of the 900px frame, centered horizontally;
    // below it the card is centered with 16px margins and scrolls when the screen is short.
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/44 p-4 lg:items-start lg:p-0 lg:pt-[240px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={(event) => {
          if (event.key === "Escape") onDismiss();
        }}
        className="flex max-h-full w-full max-w-[420px] flex-col gap-4 overflow-y-auto rounded-auth bg-surface p-[18px] shadow-modal lg:w-[420px] lg:p-[22px]"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-danger-bg text-danger">
          <TriangleAlert size={20} aria-hidden="true" />
        </span>
        <h2 id={titleId} className="text-[20px] font-bold text-ink">
          Cancelar pedido #{order.number}
        </h2>
        <p className="text-[12px] font-semibold text-muted">{formatOrderLocation(order)}</p>
        <p id={descriptionId} className="w-full text-[12px]/[17px] text-muted">
          El pedido quedará en el historial y se descontará del total pendiente de la cuenta compartida.
        </p>
        <label className="relative flex h-11 w-full items-center rounded-[9px] bg-surface outline-1 -outline-offset-[0.5px] outline-line focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-brand">
          <span className="sr-only">Motivo de cancelación</span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as CancellationReason)}
            className="h-full w-full cursor-pointer appearance-none bg-transparent pr-10 pl-3 text-[12px] font-semibold text-ink outline-none"
          >
            {CANCELLATION_REASONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 text-muted" />
        </label>
        <p className="flex w-full items-center gap-2 rounded-nav bg-warning-bg p-2.5 text-warning">
          <ShieldCheck size={16} aria-hidden="true" className="shrink-0" />
          <span className="text-[11px] font-bold">Requiere autorización del personal</span>
        </p>
        <div className="flex w-full gap-2.5">
          <button
            ref={backRef}
            type="button"
            onClick={onDismiss}
            className="flex h-11 flex-1 items-center justify-center rounded-[9px] lg:h-[42px] text-[12px] font-bold text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => onConfirm(reason)}
            className="flex h-11 flex-1 items-center justify-center rounded-[9px] lg:h-[42px] bg-danger text-[12px] font-bold text-white hover:bg-danger/92 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Cancelando…" : "Confirmar cancelación"}
          </button>
        </div>
      </div>
    </div>
  );
}
