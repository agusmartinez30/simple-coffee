"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { CreditCard, WalletCards } from "lucide-react";
import type { CollectionMethod } from "@/mocks/types";
import type { ChargeView, TipChoice } from "./charge-form";

type ChargeTableDialogProps = {
  view: ChargeView;
  method: CollectionMethod | null;
  tip: TipChoice;
  onMethodChange: (method: CollectionMethod) => void;
  onTipChange: (tip: TipChoice) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const FOCUSABLE = "button:not(:disabled), input:not(:disabled)";

/** Chip look shared by the method options and the tip chips (selected: brand outline and wash). */
const optionClass = (selected: boolean) =>
  clsx(
    "flex cursor-pointer items-center justify-center rounded-[9px] text-[12px] font-bold whitespace-nowrap outline-1 -outline-offset-[0.5px] has-focus-visible:outline-2 has-focus-visible:-outline-offset-1",
    selected ? "bg-brand-wash text-brand outline-brand" : "bg-surface text-ink outline-line hover:bg-cream",
  );

/**
 * "Cobrar Mesa NN": `alertdialog` over the dimmed main area (the `ConfirmDialog` pattern). Staff
 * picks the "Medio de pago" (the customer's preference is only a hint) and the "Propina"; nothing is
 * recorded until "Registrar cobro", which stays disabled without a method or with an invalid amount.
 * "Cancelar", Escape or the scrim close it; focus starts on the first method, stays inside the
 * dialog and returns to the opener on close.
 */
export function ChargeTableDialog({ view, method, tip, onMethodChange, onTipChange, onCancel, onConfirm }: ChargeTableDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const amountId = useId();
  const amountErrorId = useId();
  const name = useId();

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) return;
    // Keep Tab and Shift+Tab inside the dialog. A radio group is one tab stop: its checked radio,
    // or its first one while none is checked.
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element, index, all) =>
        !(element instanceof HTMLInputElement && element.type === "radio") ||
        element.checked ||
        !all.some(
          (other, otherIndex) =>
            other instanceof HTMLInputElement &&
            other.name === element.name &&
            (other.checked || otherIndex < index),
        ),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const tipChips: { key: string; label: string; detail?: string; choice: TipChoice; selected: boolean }[] = [
    { key: "none", label: "Sin propina", choice: { kind: "none" }, selected: tip.kind === "none" },
    ...view.percentTips.map(({ value, amount }) => ({
      key: `percent-${value}`,
      label: `${value}%`,
      detail: amount,
      choice: { kind: "percent", value } as const,
      selected: tip.kind === "percent" && tip.value === value,
    })),
    {
      key: "amount",
      label: "Otro monto",
      choice: { kind: "amount", text: tip.kind === "amount" ? tip.text : "" },
      selected: tip.kind === "amount",
    },
  ];

  return (
    <div
      className="fixed top-[72px] right-0 bottom-0 left-[220px] z-40 flex items-center justify-center bg-ink/33"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={onKeyDown}
        className="flex w-[440px] flex-col gap-4 rounded-auth bg-surface p-[22px] shadow-modal"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-wash text-brand">
            <CreditCard size={20} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 id={titleId} className="text-[20px] font-bold text-ink">
              Cobrar {view.label}
            </h2>
            <p id={descriptionId} className="text-[12px] text-muted">
              Total de la cuenta: <span className="font-bold text-ink">{view.total}</span>
            </p>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-bold text-ink">Medio de pago</legend>
          <div className="grid grid-cols-3 gap-2">
            {view.methods.map((option) => (
              <label key={option.id} className={clsx(optionClass(method === option.id), "relative h-11 flex-col")}>
                <input
                  type="radio"
                  name={`${name}-method`}
                  value={option.id}
                  checked={method === option.id}
                  onChange={() => onMethodChange(option.id)}
                  className="sr-only"
                />
                {option.label}
                {view.suggestedMethod === option.id && (
                  <span className="text-[9px] font-bold text-danger">Sugerido</span>
                )}
              </label>
            ))}
          </div>
          {view.preferenceHint && (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-danger">
              <WalletCards size={14} aria-hidden="true" className="shrink-0" />
              {view.preferenceHint}
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-bold text-ink">Propina</legend>
          <div className="grid grid-cols-4 gap-2">
            {tipChips.map((chip) => (
              <label key={chip.key} className={clsx(optionClass(chip.selected), "h-11 flex-col text-[11px]")}>
                <input
                  type="radio"
                  name={`${name}-tip`}
                  value={chip.key}
                  checked={chip.selected}
                  onChange={() => onTipChange(chip.choice)}
                  className="sr-only"
                />
                {chip.label}
                {chip.detail && <span className="text-[9px] font-semibold text-muted">{chip.detail}</span>}
              </label>
            ))}
          </div>
          {tip.kind === "amount" && (
            <div className="flex flex-col gap-1">
              <label htmlFor={amountId} className="sr-only">
                Monto de la propina
              </label>
              <input
                id={amountId}
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="Ej.: 1.500"
                value={tip.text}
                aria-invalid={view.tipInvalid}
                aria-describedby={view.tipInvalid ? amountErrorId : undefined}
                onChange={(event) => onTipChange({ kind: "amount", text: event.target.value })}
                className={clsx(
                  "h-10 w-full rounded-[9px] bg-surface px-3 text-[12px] font-semibold text-ink outline-1 -outline-offset-[0.5px] focus:outline-2 focus:-outline-offset-1",
                  view.tipInvalid ? "outline-danger" : "outline-line focus:outline-brand",
                )}
              />
              {view.tipInvalid && (
                <p id={amountErrorId} className="text-[11px] font-semibold text-danger">
                  Ingresá un monto en pesos, por ejemplo 1.500.
                </p>
              )}
            </div>
          )}
        </fieldset>

        <dl className="flex flex-col gap-1.5 rounded-card bg-cream p-4 text-[12px]">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="font-semibold text-ink">{view.summary.subtotal}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Propina</dt>
            <dd className="font-semibold text-ink">{view.tipInvalid ? "—" : view.summary.tip}</dd>
          </div>
          <span aria-hidden="true" className="my-1 h-px w-full bg-line" />
          <div className="flex items-baseline justify-between">
            <dt className="text-[13px] font-bold text-ink">Total a cobrar</dt>
            <dd className="text-[22px] font-bold text-ink">{view.tipInvalid ? "—" : view.summary.total}</dd>
          </div>
        </dl>

        <div className="flex w-full gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-[42px] flex-1 items-center justify-center rounded-[9px] text-[12px] font-bold text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!view.canConfirm}
            onClick={onConfirm}
            className="flex h-[42px] flex-1 items-center justify-center rounded-[9px] bg-brand text-[12px] font-bold text-white hover:bg-brand/92 disabled:cursor-not-allowed disabled:bg-brand/40"
          >
            Registrar cobro
          </button>
        </div>
      </div>
    </div>
  );
}
