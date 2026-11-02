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
      className="flex h-9 items-center gap-2 rounded-nav bg-surface px-3 text-ink outline-1 -outline-offset-[0.5px] outline-line hover:bg-cream"
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

/** "Encabezado de página": title, context line, the alerts control and "Nuevo pedido". */
export function OrdersHeader({ enabled, onToggle, onNewOrder }: OrdersHeaderProps) {
  return (
    <header className="flex h-[50px] w-full shrink-0 items-center justify-between">
      <div className="flex flex-col gap-[3px]">
        <h2 className="text-[24px] leading-tight font-extrabold whitespace-nowrap text-ink">Gestión de pedidos</h2>
        <p className="text-[12px] whitespace-nowrap text-muted">
          Priorizá, prepará y entregá sin perder el contexto del salón.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <AlertsControl enabled={enabled} onToggle={onToggle} />
        {onNewOrder && (
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={onNewOrder}
            className="flex h-9 items-center gap-1.5 rounded-nav bg-brand px-3 text-[11px] font-bold whitespace-nowrap text-white hover:bg-brand/92"
          >
            <Plus size={16} aria-hidden="true" />
            Nuevo pedido
          </button>
        )}
      </div>
    </header>
  );
}

/** "Resumen operativo": one tinted tile per kitchen stage with its alert sublabel. */
export function OrderMetrics({ metrics }: { metrics: AlertMetric[] }) {
  return (
    <ul aria-label="Resumen de pedidos" className="flex h-[66px] w-full shrink-0 gap-2.5">
      {metrics.map((metric) => {
        const tone = ORDER_TONE_CLASSES[metric.tone];
        return (
          <li
            key={metric.id}
            className={clsx("flex flex-1 items-center justify-between rounded-[10px] px-3.5 py-2.5", tone.wash)}
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
