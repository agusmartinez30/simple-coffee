import clsx from "clsx";
import { Plus, Volume2, VolumeX } from "lucide-react";
import type { AlertMetric } from "./order-alerts";
import { ORDER_TONE_CLASSES } from "./OrderTags";

type AlertsControlProps = {
  enabled: boolean;
  onToggle: () => void;
};

/** "Control de sonido": new-order and delay alerts toggle. */
function AlertsControl({ enabled, onToggle }: AlertsControlProps) {
  const Icon = enabled ? Volume2 : VolumeX;
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={onToggle}
      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-nav bg-surface px-3 text-ink lg:h-9 lg:flex-none outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream"
    >
      <Icon size={16} aria-hidden="true" className={clsx("shrink-0", enabled ? "text-brand" : "text-muted")} />
      <span className="text-[11px] font-bold whitespace-nowrap">
        {enabled ? "Alertas activas" : "Alertas silenciadas"}
      </span>
    </button>
  );
}

type OrdersHeaderProps = AlertsControlProps & {
  /** Opens "Nuevo pedido"; the button is left out when absent (offline variants). */
  onNewOrder?: () => void;
};

/**
 * "Encabezado de página": title, context line, the alerts control and "Nuevo pedido". Below `lg`
 * the actions stack under the title as a full-width row of 44px buttons.
 */
export function OrdersHeader({ enabled, onToggle, onNewOrder }: OrdersHeaderProps) {
  return (
    <header className="flex w-full shrink-0 flex-col gap-3 lg:h-[50px] lg:flex-row lg:items-center lg:justify-between lg:gap-0">
      <div className="flex flex-col gap-[3px]">
        <h2 className="text-[20px] leading-tight font-extrabold whitespace-nowrap text-ink lg:text-[24px]">Gestión de pedidos</h2>
        <p className="text-[12px] text-muted lg:whitespace-nowrap">
          Priorizá, prepará y entregá sin perder el contexto del salón.
        </p>
      </div>
      <div className="flex w-full items-center gap-2 lg:w-auto">
        <AlertsControl enabled={enabled} onToggle={onToggle} />
        {onNewOrder && (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onNewOrder}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-nav bg-brand px-3 text-[11px] font-bold whitespace-nowrap text-white hover:bg-brand/92 lg:h-9 lg:flex-none"
          >
            <Plus size={16} aria-hidden="true" />
            Nuevo pedido
          </button>
        )}
      </div>
    </header>
  );
}

/**
 * "Resumen operativo": one tinted tile per kitchen stage with its alert sublabel. Below `lg` the
 * tiles keep a 168px minimum and the row scrolls sideways.
 */
export function OrderMetrics({ metrics }: { metrics: AlertMetric[] }) {
  return (
    <ul aria-label="Resumen de pedidos" className="flex h-[66px] w-full shrink-0 gap-2.5 overflow-x-auto lg:overflow-visible">
      {metrics.map((metric) => {
        const tone = ORDER_TONE_CLASSES[metric.tone];
        return (
          <li
            key={metric.id}
            className={clsx(
              "flex min-w-[168px] flex-1 items-center justify-between gap-2 rounded-[10px] px-3.5 py-2.5 lg:min-w-auto lg:gap-0",
              tone.wash,
            )}
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold whitespace-nowrap text-muted">{metric.label}</span>
              <span className={clsx("text-[10px] whitespace-nowrap", tone.text)}>{metric.detail}</span>
            </div>
            <span className={clsx("text-[26px] leading-none font-extrabold whitespace-nowrap", tone.text)}>
              {metric.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
