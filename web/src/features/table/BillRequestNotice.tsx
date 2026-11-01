import { ReceiptText } from "lucide-react";
import { PAYMENT_METHOD_LABELS, type BillRequest } from "@/features/table-session";

type BillRequestNoticeProps = {
  request: BillRequest;
  /** Reopens the payment options; omitted when the method cannot be changed (e.g. offline). */
  onChange?: () => void;
};

/** Replaces "Pedir la cuenta" on screen 07 once the bill was requested. */
export function BillRequestNotice({ request, onChange }: BillRequestNoticeProps) {
  return (
    <div
      role="status"
      className="flex w-full items-center gap-[11px] rounded-card bg-brand-tint p-[13px] text-brand"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface">
        <ReceiptText size={17} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="text-[12px] font-bold">Cuenta pedida · {request.time} hs</p>
        <p className="text-[10.5px] leading-[13px]">
          Pagás con {PAYMENT_METHOD_LABELS[request.method]}. Ya le avisamos al personal.
        </p>
      </div>
      {onChange ? (
        <button
          type="button"
          onClick={onChange}
          aria-label={`Cambiar medio de pago (${PAYMENT_METHOD_LABELS[request.method]})`}
          className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-[11px] font-bold text-brand active:bg-brand-soft"
        >
          Cambiar
        </button>
      ) : null}
    </div>
  );
}
