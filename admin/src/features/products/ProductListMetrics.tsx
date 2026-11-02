import type { ProductMetrics } from "./product-catalog";

const METRICS = [
  { id: "published", label: "Publicados", accent: "bg-brand" },
  { id: "available", label: "Disponibles", accent: "bg-success" },
  { id: "unavailable", label: "No disponibles", accent: "bg-warning" },
] as const;

type ProductListMetricsProps = {
  metrics: ProductMetrics;
  /** "Supporting" line of each metric, e.g. "92% del catálogo". */
  support: Record<keyof ProductMetrics, string>;
};

/**
 * "Commerce Metrics": one white strip split in three metrics with a colored accent bar. Below `lg`
 * each metric keeps a 168px minimum and the strip scrolls sideways.
 */
export function ProductListMetrics({ metrics, support }: ProductListMetricsProps) {
  return (
    <ul
      aria-label="Resumen del catálogo"
      className="flex h-16 w-full shrink-0 divide-x divide-line overflow-x-auto rounded-[10px] bg-surface outline-1 -outline-offset-[0.5px] outline-line lg:overflow-visible"
    >
      {METRICS.map((metric) => (
        <li key={metric.id} className="flex min-w-[168px] flex-1 items-center gap-3 px-[18px] lg:min-w-auto">
          <span aria-hidden="true" className={`h-[34px] w-1 shrink-0 rounded-[2px] ${metric.accent}`} />
          <span className="flex flex-col gap-px">
            <span className="flex items-center gap-[7px]">
              <span className="text-[22px] leading-tight font-bold text-ink">{metrics[metric.id]}</span>
              <span className="text-[12px] font-bold whitespace-nowrap text-ink">{metric.label}</span>
            </span>
            <span className="text-[11px] whitespace-nowrap text-muted">{support[metric.id]}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
