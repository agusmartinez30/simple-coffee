import type { Ars } from "@/mocks/types";
import { formatPrice } from "@/shared/lib/format-price";
import { formatOrderCount } from "@/features/table-session";

type AccountSummaryCardProps = {
  total: Ars;
  orderCount: number;
  table: string;
};

/** Blue summary of screen 07: accumulated total, order count and table number. */
export function AccountSummaryCard({ total, orderCount, table }: AccountSummaryCardProps) {
  return (
    <section
      aria-label="Resumen de la mesa"
      className="flex h-[116px] w-full items-center justify-between rounded-panel bg-brand p-4 text-white"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[10.5px] font-bold text-white/75">Total acumulado de la mesa</p>
        <p className="text-[32px] leading-none font-bold tracking-[-0.8px]">{formatPrice(total)}</p>
        <p className="text-[9.5px] text-white/65">Mesa {table}</p>
      </div>
      <p className="text-[11px] font-bold">{formatOrderCount(orderCount)}</p>
    </section>
  );
}
