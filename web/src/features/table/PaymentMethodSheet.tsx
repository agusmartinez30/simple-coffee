"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ReceiptText, X } from "lucide-react";
import clsx from "clsx";
import type { PaymentMethod } from "@/features/table-session";
import { PrimaryButton } from "@/shared/ui";
import { PAYMENT_OPTIONS } from "./payment-options";

type PaymentMethodSheetProps = {
  /** Preselected method, e.g. when changing an existing request. */
  initialMethod?: PaymentMethod;
  confirming: boolean;
  onConfirm: (method: PaymentMethod) => void;
  onClose: () => void;
};

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet to pick how the guest pays before asking for the bill. Render it only while open:
 * the selection starts from `initialMethod` on every mount.
 */
export function PaymentMethodSheet({ initialMethod, confirming, onConfirm, onClose }: PaymentMethodSheetProps) {
  const [selected, setSelected] = useState<PaymentMethod | undefined>(initialMethod);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const name = useId();

  useEffect(() => {
    // Move focus into the sheet (the chosen option first) and give it back on close.
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const target =
      panel?.querySelector<HTMLElement>("input:checked") ?? panel?.querySelector<HTMLElement>("input");
    target?.focus();
    return () => previous?.focus();
  }, []);

  function close() {
    if (!confirming) onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    // Keep keyboard focus inside the modal sheet. The radio group is a single tab stop.
    const active = document.activeElement;
    const isRadio = (element: Element | null) => element instanceof HTMLInputElement && element.type === "radio";
    const radios = Array.from(panelRef.current.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    const groupStop = (isRadio(active) ? active : null) ?? radios.find((radio) => radio.checked) ?? radios[0];
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => !isRadio(element) || element === groupStop,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div aria-hidden="true" className="absolute inset-0 bg-ink/40" onClick={close} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        className="relative flex w-full max-w-[390px] flex-col gap-4 rounded-t-panel bg-cream px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] shadow-bar"
      >
        <span aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-line" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-[18px] font-bold text-ink">
              ¿Cómo vas a pagar?
            </h2>
            <p className="text-[11px] leading-[14px] text-muted">Avisamos al personal para que te acerque la cuenta.</p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={confirming}
            aria-label="Cerrar"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-ink disabled:text-faint"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <div role="radiogroup" aria-labelledby={titleId} className="flex flex-col gap-2">
          {PAYMENT_OPTIONS.map((option) => {
            const checked = selected === option.method;
            const Icon = option.icon;
            return (
              <label
                key={option.method}
                className={clsx(
                  "flex min-h-[68px] w-full items-center gap-3 rounded-card bg-surface px-3 py-3 outline-solid",
                  checked
                    ? "outline-[1.5px] -outline-offset-[0.75px] outline-brand"
                    : "outline-1 -outline-offset-[0.5px] outline-line",
                  confirming ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.method}
                  checked={checked}
                  disabled={confirming}
                  onChange={() => setSelected(option.method)}
                  className="peer sr-only"
                />
                <span
                  className={clsx(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    checked ? "bg-brand text-white" : "bg-lilac text-brand",
                  )}
                >
                  <Icon size={19} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-bold text-ink">{option.label}</span>
                  <span className="text-[11px] leading-[14px] text-muted">{option.description}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "flex size-5 shrink-0 items-center justify-center rounded-full bg-surface outline-2 -outline-offset-1 outline-solid peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40",
                    checked ? "outline-brand" : "outline-faint",
                  )}
                >
                  {checked ? <span className="size-2.5 rounded-full bg-brand" /> : null}
                </span>
              </label>
            );
          })}
        </div>

        <PrimaryButton
          size="md"
          icon={ReceiptText}
          disabled={!selected}
          loading={confirming}
          onClick={() => {
            if (selected) onConfirm(selected);
          }}
        >
          Pedir la cuenta
        </PrimaryButton>
      </div>
    </div>
  );
}
