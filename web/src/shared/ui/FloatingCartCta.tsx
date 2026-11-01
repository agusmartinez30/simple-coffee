import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import clsx from "clsx";
import { formatPrice } from "@/shared/lib/format-price";

type FloatingCartCtaProps = {
  itemCount: number;
  total: number;
  href?: string;
  /** `bag`: bag icon with item count below the label (menu). `count`: count bubble (explore). */
  variant?: "bag" | "count";
  className?: string;
};

export function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? "producto" : "productos"}`;
}

/** Dark floating "Ver mi pedido" bar shown above the bottom navigation. */
export function FloatingCartCta({
  itemCount,
  total,
  href = "/table",
  variant = "bag",
  className,
}: FloatingCartCtaProps) {
  return (
    <Link
      href={href}
      aria-label={`Ver mi pedido: ${formatItemCount(itemCount)}, ${formatPrice(total)}`}
      className={clsx(
        "flex h-[58px] w-full items-center justify-between rounded-[29px] bg-ink text-white shadow-float",
        variant === "bag" ? "px-[15px]" : "px-4",
        className,
      )}
    >
      <span className="flex items-center gap-2.5">
        {variant === "bag" ? (
          <>
            <span className="flex size-[34px] items-center justify-center rounded-full bg-brand">
              <ShoppingBag size={17} aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-[13px] font-bold">Ver mi pedido</span>
              <span className="text-[9px] text-white/72">{formatItemCount(itemCount)}</span>
            </span>
          </>
        ) : (
          <>
            <span className="flex size-7 items-center justify-center rounded-full bg-brand text-[12px] font-bold">
              {itemCount}
            </span>
            <span className="text-[13px] font-bold">Ver mi pedido</span>
          </>
        )}
      </span>
      <span className="flex items-center gap-2">
        <span className={clsx("font-bold", variant === "bag" ? "text-[14px]" : "text-[13px]")}>
          {formatPrice(total)}
        </span>
        <ArrowRight size={17} aria-hidden="true" />
      </span>
    </Link>
  );
}
