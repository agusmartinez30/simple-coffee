import clsx from "clsx";
import { ClipboardPlus, CreditCard, ShieldCheck, WalletCards, X } from "lucide-react";
import type { TableDetail } from "./table-detail";
import { InfoTag, StatusBadge, TONE_CLASSES } from "./TableTags";

type TableDetailPanelProps = {
  detail: TableDetail;
  onClose: () => void;
  onLoadOrder: () => void;
  onCharge: () => void;
};

/**
 * "Detalle rápido" (02D): quick-detail side panel over the right edge of the screen with the shared
 * total, the products of every order of the session and the "Cargar pedido" / "Cobrar mesa" actions.
 */
export function TableDetailPanel({ detail, onClose, onLoadOrder, onCharge }: TableDetailPanelProps) {
  return (
    <aside
      aria-label={`Detalle rápido · ${detail.label}`}
      className="fixed top-[76px] right-0 bottom-1 z-20 flex w-80 flex-col gap-[18px] bg-surface p-6 shadow-drawer"
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold tracking-[1.2px] whitespace-nowrap text-muted">DETALLE RÁPIDO</p>
          <h3 className="text-[24px] font-bold whitespace-nowrap text-ink">{detail.label}</h3>
        </div>
        <button
          type="button"
          aria-label="Cerrar detalle"
          onClick={onClose}
          className="flex size-5 items-center justify-center text-muted hover:text-ink"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <StatusBadge {...detail.badge} />
      <div className="flex w-full shrink-0 flex-col gap-1 rounded-card bg-cream p-4">
        <p className="text-[12px] whitespace-nowrap text-muted">Total cuenta compartida</p>
        <p className="text-[28px] font-bold whitespace-nowrap text-ink">{detail.total}</p>
      </div>

      <section aria-label="Productos de los pedidos" className="flex min-h-0 w-full flex-col gap-3">
        <div className="flex w-full items-center justify-between">
          <h4 className="text-[13px] font-bold whitespace-nowrap text-ink">Productos de los pedidos</h4>
          <p className="text-[10px] font-bold whitespace-nowrap text-muted">{detail.productCount}</p>
        </div>
        {detail.orders.length === 0 ? (
          <p className="text-[11px] text-muted">Sin pedidos todavía.</p>
        ) : (
          <ul className="flex min-h-0 flex-col gap-3 overflow-y-auto">
            {detail.orders.map((order, index) => (
              <li key={order.id} className="flex flex-col gap-3">
                {index > 0 && <span aria-hidden="true" className="h-px w-full shrink-0 bg-line" />}
                <div className="flex flex-col gap-2">
                  <div className="flex w-full items-center justify-between">
                    <p className="text-[11px] font-bold whitespace-nowrap text-ink">{order.label}</p>
                    <span
                      className={clsx(
                        "rounded-[6px] px-[7px] py-1 text-[9px] font-bold whitespace-nowrap",
                        TONE_CLASSES[order.status.tone].wash,
                        TONE_CLASSES[order.status.tone].text,
                      )}
                    >
                      {order.status.label}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {order.lines.map((line) => (
                      <li key={line.id} className="flex w-full items-start justify-between gap-3">
                        <span className="flex min-w-0 items-start gap-[7px]">
                          <span className="text-[10px] font-bold whitespace-nowrap text-brand">{line.quantityLabel}</span>
                          <span className="text-[11px] text-ink">{line.name}</span>
                        </span>
                        <span className="text-[10px] font-semibold whitespace-nowrap text-ink">{line.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InfoTag icon={WalletCards} {...detail.account} />
      <div className="flex-1" />
      <div className="flex w-full items-center gap-2">
        <ShieldCheck size={15} aria-hidden="true" className="shrink-0 text-muted" />
        <p className="flex-1 text-[11px]/[14px] text-muted">{detail.note}</p>
      </div>
      <button
        type="button"
        onClick={onLoadOrder}
        className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] bg-surface text-[13px] font-bold whitespace-nowrap text-brand outline-1 -outline-offset-[0.5px] outline-brand hover:bg-brand-wash"
      >
        <ClipboardPlus size={16} aria-hidden="true" />
        Cargar pedido / productos
      </button>
      {detail.canCharge && (
        <button
          type="button"
          onClick={onCharge}
          className="flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] bg-brand text-[13px] font-bold whitespace-nowrap text-white hover:bg-brand/92"
        >
          <CreditCard size={16} aria-hidden="true" />
          Cobrar mesa
        </button>
      )}
    </aside>
  );
}
